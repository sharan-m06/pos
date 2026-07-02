CREATE TABLE purchase_bills (
 id VARCHAR(36) PRIMARY KEY, bill_no VARCHAR(100) NOT NULL UNIQUE, supplier_id VARCHAR(36),
 supplier_name VARCHAR(255), supplier_gstin VARCHAR(50), supplier_invoice_no VARCHAR(100),
 linked_po_id VARCHAR(36), status VARCHAR(30), subtotal DECIMAL(14,2), total_cgst DECIMAL(14,2),
 total_sgst DECIMAL(14,2), total_igst DECIMAL(14,2), total_gst DECIMAL(14,2), grand_total DECIMAL(14,2),
 amount_paid DECIMAL(14,2), balance_due DECIMAL(14,2), bill_date DATE, due_date DATE,
 payment_mode VARCHAR(50), payment_date DATE, payment_status VARCHAR(50), paid_via VARCHAR(50),
 stock_applied_at TIMESTAMP, stock_reversed_at TIMESTAMP, reminder_enabled BOOLEAN NOT NULL DEFAULT FALSE,
 remind_on DATE, notes CLOB, created_by VARCHAR(100), created_at TIMESTAMP,
 CONSTRAINT fk_bill_supplier FOREIGN KEY(supplier_id) REFERENCES suppliers(id),
 CONSTRAINT fk_bill_po FOREIGN KEY(linked_po_id) REFERENCES purchase_orders(id)
);
CREATE TABLE purchase_bill_items (
 id VARCHAR(36) PRIMARY KEY, purchase_bill_id VARCHAR(36) NOT NULL, product_id VARCHAR(36),
 product_name VARCHAR(255), sku VARCHAR(100), quantity DECIMAL(14,3), unit VARCHAR(30),
 unit_cost DECIMAL(14,2), gst_rate DECIMAL(12,2), cgst DECIMAL(14,2), sgst DECIMAL(14,2),
 igst DECIMAL(14,2), line_total DECIMAL(14,2), update_stock BOOLEAN NOT NULL DEFAULT TRUE,
 CONSTRAINT fk_pbi_bill FOREIGN KEY(purchase_bill_id) REFERENCES purchase_bills(id) ON DELETE CASCADE
);
CREATE TABLE purchase_bill_attachments (
 id VARCHAR(36) PRIMARY KEY, purchase_bill_id VARCHAR(36) NOT NULL, name VARCHAR(255),
 file_type VARCHAR(100), file_size BIGINT, file_path VARCHAR(1000), uploaded_at TIMESTAMP,
 CONSTRAINT fk_attachment_bill FOREIGN KEY(purchase_bill_id) REFERENCES purchase_bills(id) ON DELETE CASCADE
);
