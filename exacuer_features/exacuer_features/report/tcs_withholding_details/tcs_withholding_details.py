import frappe
from frappe import _

def execute(filters=None):
    validate_filters(filters)

    # Determine the doctype and party field based on the party_type filter
    if filters.get("party_type") == "Customer":
        doctype = "Sales Invoice"
        party_field = "customer"
    elif filters.get("party_type") == "Supplier":
        doctype = "Purchase Invoice"
        party_field = "supplier"

    # Get the data and aggregate it
    data = get_tcs_aggregated_data(filters, doctype, party_field)

    # Get the columns for the report
    columns = get_columns()

    return columns, data


def validate_filters(filters):
    """Validate the from_date and to_date filters."""
    if not filters.get("from_date") or not filters.get("to_date"):
        frappe.throw(_("Please select both From Date and To Date"))
    if filters.get("from_date") > filters.get("to_date"):
        frappe.throw(_("From Date cannot be later than To Date"))


def get_tcs_aggregated_data(filters, doctype, party_field):
    """Fetch and aggregate TCS data based on the party type (Customer or Supplier)."""

    # SQL query to fetch invoices with TCS data, including fetching the percentage from the linked TCS doctype
    query = f"""
    SELECT
        inv.name as invoice_id,
        inv.posting_date as invoice_date,
        inv.{party_field} as party,
        inv.company as company,  # Include company in the results
        inv.total as total_amount,
        ROUND(tcs.tcs_percentage, 0) as tcs_percentage,
        inv.custom_taxes_and_charges_collection_inr as tcs_amount
    FROM
        `tab{doctype}` inv
    LEFT JOIN
        `tabTCS` tcs ON inv.custom_tcs_percentage = tcs.name
    WHERE
        inv.custom_taxes_and_charges_collection_inr > 0
        AND inv.posting_date BETWEEN %(from_date)s AND %(to_date)s
        {f"AND inv.{party_field} = %(party)s" if filters.get("party") else ""}
        {f"AND inv.company = %(company)s" if filters.get("company") else ""}
    ORDER BY
        inv.posting_date
"""





    # Execute the query with filters
    data = frappe.db.sql(query, {
        "party": filters.get("party"),
        "from_date": filters.get("from_date"),
        "to_date": filters.get("to_date"),
        "company": filters.get("company")
    }, as_dict=True)

    # Fallback to calculate TCS percentage if it's missing from the linked TCS doctype
    # for row in data:
    #     if not row.get("tcs_percentage") and row.get("total_amount") and row.get("tcs_amount"):
    #         row["tcs_percentage"] = (row["tcs_amount"] / row["total_amount"]) * 100

    return data


def get_columns():
    """Return the columns for the TCS Computation Summary report."""
    return [
        {"label": _("Invoice ID"), "fieldname": "invoice_id", "fieldtype": "Link", "options": "Purchase Invoice", "width": 150},
        {"label": _("Party"), "fieldname": "party", "fieldtype": "Link", "options": "Customer", "width": 180},
        {
            "label": _("Company"),  
            "fieldname": "company",
            "fieldtype": "Link",
            "options": "Company",
            "width": 180
        },
        {"label": _("Invoice Date"), "fieldname": "invoice_date", "fieldtype": "Date", "width": 120},
        {"label": _("Total Amount"), "fieldname": "total_amount", "fieldtype": "Currency", "width": 120},
        {"label": _("TCS Percentage"), "fieldname": "tcs_percentage", "fieldtype": "Percent", "width": 100},
        {"label": _("TCS Amount"), "fieldname": "tcs_amount", "fieldtype": "Currency", "width": 120},
        
    ]
