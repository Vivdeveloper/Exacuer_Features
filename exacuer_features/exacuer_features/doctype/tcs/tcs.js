frappe.ui.form.on('TCS', {
    company: function(frm) {
        frm.set_query('account', function() {
            return {
                filters: {
                    'company': frm.doc.company
                }
            };
        });
    }
});
