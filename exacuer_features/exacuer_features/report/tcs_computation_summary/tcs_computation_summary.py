import frappe
from frappe import _

def execute(filters=None):
    validate_filters(filters)

    # Fetch TCS records
    data = get_tcs_aggregated_data(filters)
    
    # Group by company, supplier, and custom_tcs_percentage
    grouped_data = group_by_company_supplier_tcs(data)

    # Get columns
    columns = get_columns()

    return columns, grouped_data


def get_tcs_aggregated_data(filters):
    # Base query for Supplier (Purchase Invoice)
    if filters.get("party_type") == "Supplier":
        query = """
            SELECT
                pi.company, 
                pi.supplier as party, 
                pi.name as invoice_id, 
                pi.posting_date as invoice_date, 
                pi.total as total_amount, 
                tcs.tcs_percentage as tcs_percentage, 
                pi.custom_taxes_and_charges_collection_inr as tcs_amount
            FROM `tabPurchase Invoice` pi
            LEFT JOIN `tabTCS` tcs ON pi.custom_tcs_percentage = tcs.name
            WHERE pi.docstatus = 1
            AND pi.posting_date BETWEEN %(from_date)s AND %(to_date)s
        """
        # Apply the party filter if selected
        if filters.get("party"):
            query += " AND pi.supplier = %(party)s"
        
        # Apply the company filter if selected
        if filters.get("company"):
            query += " AND pi.company = %(company)s"
    
    # Base query for Customer (Sales Invoice)
    elif filters.get("party_type") == "Customer":
        query = """
            SELECT
                si.company, 
                si.customer as party, 
                si.name as invoice_id, 
                si.posting_date as invoice_date, 
                si.total as total_amount, 
                tcs.tcs_percentage as tcs_percentage, 
                si.custom_taxes_and_charges_collection_inr as tcs_amount
            FROM `tabSales Invoice` si
            LEFT JOIN `tabTCS` tcs ON si.custom_tcs_percentage = tcs.name
            WHERE si.docstatus = 1
            AND si.posting_date BETWEEN %(from_date)s AND %(to_date)s
        """
        # Apply the party filter if selected
        if filters.get("party"):
            query += " AND si.customer = %(party)s"
        
        # Apply the company filter if selected
        if filters.get("company"):
            query += " AND si.company = %(company)s"

    # Execute the query
    return frappe.db.sql(query, filters, as_dict=1)





def group_by_company_supplier_tcs(data):
    grouped = {}
    
    # Group by company, supplier, and custom_tcs_percentage
    for row in data:
        key = (row['company'], row['party'], row['tcs_percentage'])
        
        if key not in grouped:
            grouped[key] = {
                'company': row['company'],
                'party': row['party'],
                'tcs_percentage': row['tcs_percentage'],
                'total_amount': 0,
                'tcs_amount': 0
            }
        
        grouped[key]['total_amount'] += row['total_amount']
        grouped[key]['tcs_amount'] += row['tcs_amount']

    return list(grouped.values())


def get_columns():
    return [
        {"label": _("Company"), "fieldname": "company", "fieldtype": "Data", "width": 150},
        {"label": _("Supplier"), "fieldname": "party", "fieldtype": "Link", "options": "Supplier", "width": 150},
        {"label": _("TCS Percentage"), "fieldname": "tcs_percentage", "fieldtype": "Percent", "width": 100},
        {"label": _("Total Amount"), "fieldname": "total_amount", "fieldtype": "Currency", "width": 150},
        {"label": _("TCS Amount"), "fieldname": "tcs_amount", "fieldtype": "Currency", "width": 150},
    ]


def validate_filters(filters):
    if filters.get("from_date") > filters.get("to_date"):
        frappe.throw(_("From Date cannot be greater than To Date"))

