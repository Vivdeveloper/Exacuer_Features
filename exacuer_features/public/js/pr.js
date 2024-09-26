frappe.ui.form.on('Purchase Receipt', {
    custom_is_tcs: function(frm) {
        if (frm.doc.custom_is_tcs) {
            calculate_tcs_and_update_taxes(frm);
        } else {
            remove_tcs_rows(frm);
        }
    },
    custom_tcs_percentage: function(frm) {
        if (!frm.doc.custom_tcs_percentage || frm.doc.custom_tcs_percentage === '') {
            // If TCS percentage is removed, clear all TCS-related changes
            remove_tcs_rows(frm);
        } else if (frm.doc.custom_is_tcs) {
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
frappe.ui.form.on('Purchase Receipt Item', {
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
        calculate_tcs_and_update_taxes(frm);
    }
}

function calculate_tcs_and_update_taxes(frm) {
    if (frm.doc.custom_tcs_percentage) {  // Updated field name for Sales Order
        frappe.db.get_value('TCS', frm.doc.custom_tcs_percentage, ['tcs_percentage', 'account'], (r) => {  
            if (r && r.tcs_percentage && r.account) {
                let tcs_percentage = r.tcs_percentage;
                let account_head = r.account;

                let total_amount = frm.doc.total || 0;

                // Skip GST amounts if custom_tcs_without_gst is checked
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

                let combined_amount = total_amount + total_gst_amount;

                let custom_taxes_and_charges_collection_inr = (combined_amount * tcs_percentage) / 100;

                // Directly set the calculated value without refreshing the entire form
                frm.set_value('custom_taxes_and_charges_collection_inr', custom_taxes_and_charges_collection_inr);

                // Check if a TCS row already exists
                let tcs_row_exists = false;
                let previous_total = 0;  // Initialize for cumulative total calculation
                
                frm.doc.taxes.forEach(function(row) {
                    if (row.description && row.description.includes('TCS')) {
                        // Update the existing TCS row
                        row.tax_amount = custom_taxes_and_charges_collection_inr;
                        row.rate = tcs_percentage;
                        tcs_row_exists = true;
                    }
                    // Calculate the cumulative total
                    row.total = previous_total + row.tax_amount;
                    previous_total = row.total;  // Update previous total for the next row
                });

                if (!tcs_row_exists) {
                    // Add new tax row without form refresh
                    let new_tax_row = frm.add_child('taxes');
                    
                    // Directly assign values to the new tax row object
                    new_tax_row.charge_type = 'Actual';
                    new_tax_row.account_head = account_head;
                    new_tax_row.description = `TCS @ ${tcs_percentage}%`; // Set description with TCS percentage
                    new_tax_row.tax_amount = custom_taxes_and_charges_collection_inr;
                    new_tax_row.add_deduct_tax = 'Add';
                    new_tax_row.rate = tcs_percentage;

                    // Calculate cumulative total for the new row
                    new_tax_row.total = previous_total + new_tax_row.tax_amount;
                    previous_total = new_tax_row.total;  // Update previous total for future rows
                }

                // Refresh only the taxes field to reflect changes in the taxes table
                frm.refresh_field('taxes');
            }
        });
    }
}

function remove_tcs_rows(frm) {
    frm.doc.taxes = frm.doc.taxes.filter(function(row) {
        return row.description.indexOf('TCS') === -1;
    });

    frm.set_value('custom_tcs_percentage', null);  // Updated field name
    frm.set_value('custom_taxes_and_charges_collection_inr', 0);
    frm.refresh_field('taxes');
}
