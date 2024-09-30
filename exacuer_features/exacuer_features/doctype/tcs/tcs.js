// frappe.ui.form.on('TCS ACCOUNTS', {
//     company: function(frm, cdt, cdn) {
//         var row = locals[cdt][cdn];
//         if (row.company) {
//             frappe.call({
//                 method: 'frappe.client.get_list',
//                 args: {
//                     doctype: 'Account',
//                     filters: {
//                         'company': row.company
//                     },
//                     fields: ['name']
//                 },
//                 callback: function(data) {
//                     if (data.message) {
//                         var accounts = $.map(data.message, function(d) {
//                             return d.name;
//                         });
//                         frm.fields_dict['accounts'].grid.get_field('account').get_query = function() {
//                             return {
//                                 filters: {
//                                     'name': ['in', accounts]
//                                 }
//                             };
//                         };
//                     }
//                 }
//             });
//         }
//     }
// });
