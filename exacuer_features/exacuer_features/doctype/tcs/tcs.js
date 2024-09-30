frappe.ui.form.on('TCS', {
    refresh: function(frm) {
        frm.fields_dict['accounts'].grid.get_field('account').get_query = function(doc, cdt, cdn) {
            var child_row = locals[cdt][cdn];
            if (child_row.company) {
                return {
                    filters: {
                        'company': child_row.company
                    }
                };
            } else {
                return {
                    filters: {}
                };
            }
        };
    }
});
