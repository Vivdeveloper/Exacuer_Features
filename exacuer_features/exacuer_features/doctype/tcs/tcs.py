# Copyright (c) 2024, swapnil and contributors
# For license information, please see license.txt

# import frappe
from frappe.model.document import Document


class TCS(Document):
	def autoname(self):
		self.name = f"TCS-{self.tcs_percentage}"

