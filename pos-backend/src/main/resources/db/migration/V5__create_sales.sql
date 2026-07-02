CREATE TABLE invoices (
 id VARCHAR(36) PRIMARY KEY, invoice_no VARCHAR(100) NOT NULL UNIQUE, customer_id VARCHAR(36),
 customer_name VARCHAR(255), salesperson_id VARCHAR(36), salesperson_name VARCHAR(255),
 status VARCHAR(30), payment_mode VARCHAR(50), subtotal DECIMAL(14,2), gst_amount DECIMAL(14,2),
 total DECIMAL(14,2), discount DECIMAL(14,2), invoice_date TIMESTAMP, notes CLOB, created_at TIMESTAMP
);
CREATE TABLE invoice_items (
 id VARCHAR(36) PRIMARY KEY, invoice_id VARCHAR(36) NOT NULL, product_id VARCHAR(36),
 product_name VARCHAR(255), quantity DECIMAL(14,3), unit_price DECIMAL(14,2), gst_rate DECIMAL(12,2),
 gst_amount DECIMAL(14,2), line_total DECIMAL(14,2),
 CONSTRAINT fk_item_invoice FOREIGN KEY(invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);
