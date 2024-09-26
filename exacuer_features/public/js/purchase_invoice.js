frappe.ui.form.on('Purchase Invoice', {
    custom_is_tcs: function(frm) {
        if (frm.doc.custom_is_tcs) {
            calculate_tcs_and_update_taxes(frm);
        } else {
            remove_tcs_rows(frm);
        }
    },
    custom_tcs_percentage_: function(frm) {
        if (frm.doc.custom_is_tcs|| frm.doc.custom_tcs_percentage_ === '') {
            calculate_tcs_and_update_taxes(frm);
        }else if (frm.doc.custom_is_tcs) {
            // If TCS percentage is set and TCS is checked
            calculate_tcs_and_update_taxes(frm);
        }
    },
    custom_tcs_without_gst: function(frm) {
        if (frm.doc.custom_is_tcs) {
            calculate_tcs_and_update_taxes(frm);
        } 
    },
});

// This event triggers when any field in the child table (Items) changes.
frappe.ui.form.on('Purchase Invoice Item', {
    item_code: function(frm, cdt, cdn) {
        // Adding a 2-second delay before calling the TCS calculation function
        setTimeout(function() {
            update_tcs_on_item_change(frm, cdt, cdn);
        }, 2000);  // 2-second delay
    },
    qty: function(frm, cdt, cdn) {
        // Adding a 2-second delay before calling the TCS calculation function
        setTimeout(function() {
            update_tcs_on_item_change(frm, cdt, cdn);
        }, 2000);  // 2-second delay
    },
    rate: function(frm, cdt, cdn) {
        // Adding a 2-second delay before calling the TCS calculation function
        setTimeout(function() {
            update_tcs_on_item_change(frm, cdt, cdn);
        }, 2000);  // 2-second delay
    },
    amount: function(frm, cdt, cdn) {
        // Adding a 2-second delay before calling the TCS calculation function
        setTimeout(function() {
            update_tcs_on_item_change(frm, cdt, cdn);
        }, 2000);  // 2-second delay
    },
    items_remove: function(frm) {
        if (frm.doc.custom_is_tcs) {
            // Adding a 2-second delay before calculating TCS when item is removed
            setTimeout(function() {
                calculate_tcs_and_update_taxes(frm);
            }, 2000);  // 2-second delay
        }
    }
});

function update_tcs_on_item_change(frm, cdt, cdn) {
    if (frm.doc.custom_is_tcs) {
        console.log('Item changed, calculating TCS...');
        calculate_tcs_and_update_taxes(frm);
    }
}

function calculate_tcs_and_update_taxes(frm) {
    console.log('Starting TCS calculation...');
    if (frm.doc.custom_tcs_percentage_) {
        frappe.db.get_value('TCS', frm.doc.custom_tcs_percentage_, ['tcs_percentage', 'account'], (r) => {
            if (r && r.tcs_percentage && r.account) {
                let tcs_percentage = r.tcs_percentage;
                let account_head = r.account;

                console.log(`TCS Percentage: ${tcs_percentage}`);
                console.log(`Account Head: ${account_head}`);

                let total_amount = frm.doc.total || 0;
                console.log(`Total Amount: ${total_amount}`);

                let total_gst_amount = 0;
                if (!frm.doc.custom_tcs_without_gst) {
                    frm.doc.items.forEach(function(item) {
                        total_gst_amount += (item.igst_amount || 0) + 
                                            (item.cgst_amount || 0) + 
                                            (item.sgst_amount || 0) + 
                                            (item.cess_amount || 0) + 
                                            (item.cess_non_advol_amount || 0);
                    });
                }

                console.log(`Total GST Amount from Items: ${total_gst_amount}`);

                let combined_amount = total_amount + total_gst_amount;
                console.log(`Combined Amount (Total + GST): ${combined_amount}`);

                let custom_taxes_and_charges_collection_inr = (combined_amount * tcs_percentage) / 100;
                console.log(`Calculated TCS Amount: ${custom_taxes_and_charges_collection_inr}`);

                // Directly set the calculated value without refreshing the entire form
                frm.set_value('custom_taxes_and_charges_collection_inr', custom_taxes_and_charges_collection_inr);

                // Check if a TCS row already exists
                let tcs_row_exists = false;
                frm.doc.taxes.forEach(function(row) {
                    if (row.description && row.description.includes('TCS')) {
                        console.log('Updating existing TCS row...');
                        // Update the existing TCS row
                        frappe.model.set_value(row.doctype, row.name, 'tax_amount', custom_taxes_and_charges_collection_inr);
                        frappe.model.set_value(row.doctype, row.name, 'rate', tcs_percentage);
                        tcs_row_exists = true;
                    }
                });

                if (!tcs_row_exists) {
                    console.log('No existing TCS row, adding new...');
                    // Add new tax row without form refresh
                    let new_tax_row = frm.add_child('taxes');
                    
                    // Directly assign values to the new tax row object
                    new_tax_row.charge_type = 'Actual';
                    new_tax_row.account_head = account_head;
                    new_tax_row.description = `TCS @ ${tcs_percentage}%`; // Set description with TCS percentage
                    new_tax_row.tax_amount = custom_taxes_and_charges_collection_inr;
                    new_tax_row.add_deduct_tax = 'Add';
                    new_tax_row.rate = tcs_percentage;
                    new_tax_row.total = combined_amount;
                   
                }
                

                // Refresh only the taxes field to reflect changes in the taxes table
                frm.refresh_field('taxes');

                console.log('TCS calculation complete.');
            }
        });
    }
}

function remove_tcs_rows(frm) {
    frm.doc.taxes = frm.doc.taxes.filter(function(row) {
        return row.description.indexOf('TCS') === -1;
    });

    frm.set_value('custom_tcs_percentage_', null);
    frm.set_value('custom_taxes_and_charges_collection_inr', 0);
    frm.refresh_field('taxes');

    console.log('TCS rows removed.');
}
