frappe.ui.form.on('Purchase Receipt', {
    custom_is_tcs: function(frm) {
        if (frm.doc.custom_is_tcs) {
            // Automatically uncheck 'custom_tcs_without_gst' when 'custom_is_tcs' is checked
            frm.set_value('custom_tcs_without_gst', 0);
            calculate_tcs_and_update_taxes(frm);
        } else {
            // Check if both fields are unchecked
            if (!frm.doc.custom_tcs_without_gst) {
                clear_tcs_percentage_if_both_unchecked(frm);
            } else {
                remove_tcs_rows(frm);
            }
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
        if (frm.doc.custom_tcs_without_gst) {
            // Automatically uncheck 'custom_is_tcs' when 'custom_tcs_without_gst' is checked
            frm.set_value('custom_is_tcs', 0);
            calculate_tcs_and_update_taxes(frm);
        } else {
            // Check if both fields are unchecked
            if (!frm.doc.custom_is_tcs) {
                clear_tcs_percentage_if_both_unchecked(frm);
            }
        }
    },
});

// Function to clear the TCS percentage if both checkboxes are unchecked
function clear_tcs_percentage_if_both_unchecked(frm) {
    if (!frm.doc.custom_is_tcs && !frm.doc.custom_tcs_without_gst) {
        frm.set_value('custom_tcs_percentage', null);  // Clear TCS percentage if both are unchecked
        frm.set_value('custom_taxes_and_charges_collection_inr', 0);  // Reset custom TCS amount
        frm.refresh_field('taxes');
    }
}

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
    if (frm.doc.custom_is_tcs || frm.doc.custom_tcs_without_gst) {
        calculate_tcs_and_update_taxes(frm);
    }
}

function calculate_tcs_and_update_taxes(frm) {
    if (frm.doc.custom_tcs_percentage) {
        // Fetch the TCS percentage and filter by company
        frappe.db.get_doc('TCS', frm.doc.custom_tcs_percentage).then((doc) => {
            if (doc) {
                let tcs_percentage = doc.tcs_percentage;
                let company = frm.doc.company;

                // Find the account head in the child table based on the current company's name
                let account_head = null;
                doc.accounts.forEach(function(account) {
                    if (account.company === company) {
                        account_head = account.account;
                    }
                });

                // If account_head is found, proceed with TCS calculation
                if (account_head) {
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

                    // Set the calculated TCS amount
                    frm.set_value('custom_taxes_and_charges_collection_inr', custom_taxes_and_charges_collection_inr);

                    // Check if a TCS row already exists in taxes table
                    let tcs_row_exists = false;
                    let previous_total = 0;

                    frm.doc.taxes.forEach(function(row) {
                        if (row.description && row.description.includes('TCS')) {
                            row.tax_amount = custom_taxes_and_charges_collection_inr;
                            row.rate = tcs_percentage;
                            tcs_row_exists = true;
                        }
                        row.total = previous_total + row.tax_amount;
                        previous_total = row.total;
                    });

                    // If no TCS row exists, add a new one
                    if (!tcs_row_exists) {
                        let new_tax_row = frm.add_child('taxes');
                        new_tax_row.charge_type = 'Actual';
                        new_tax_row.account_head = account_head;
                        new_tax_row.description = `TCS @ ${tcs_percentage}%`;
                        new_tax_row.tax_amount = custom_taxes_and_charges_collection_inr;
                        new_tax_row.add_deduct_tax = 'Add';
                        new_tax_row.rate = tcs_percentage;
                        new_tax_row.total = previous_total + new_tax_row.tax_amount;
                    }

                    // Refresh the taxes field to reflect changes
                    frm.refresh_field('taxes');
                } else {
                    frappe.msgprint(__('No account head found for the company: ' + company));
                }
            }
        });
    }
}


function remove_tcs_rows(frm) {
    frm.doc.taxes = frm.doc.taxes.filter(function(row) {
        return row.description.indexOf('TCS') === -1;
    });

    frm.set_value('custom_taxes_and_charges_collection_inr', 0);  // Reset custom TCS amount

    // Only clear 'custom_tcs_percentage' if both 'custom_is_tcs' and 'custom_tcs_without_gst' are unchecked
    if (!frm.doc.custom_is_tcs && !frm.doc.custom_tcs_without_gst) {
        frm.set_value('custom_tcs_percentage', null);  
    }

    frm.refresh_field('taxes');
}
