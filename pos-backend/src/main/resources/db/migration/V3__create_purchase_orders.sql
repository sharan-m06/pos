CREATE TABLE purchase_orders (
 id VARCHAR(36) PRIMARY KEY, supplier_id VARCHAR(36), supplier_name VARCHAR(255), supplier_gstin VARCHAR(50),
 status VARCHAR(30), subtotal DECIMAL(14,2), total_cgst DECIMAL(14,2), total_sgst DECIMAL(14,2),
 total_igst DECIMAL(14,2), total_gst DECIMAL(14,2), grand_total DECIMAL(14,2), order_date DATE,
 expected_date DATE, received_date DATE, notes CLOB, created_by VARCHAR(100), created_at TIMESTAMP,
 updated_at TIMESTAMP, CONSTRAINT fk_po_supplier FOREIGN KEY(supplier_id) REFERENCES suppliers(id)
);
CREATE TABLE purchase_order_items (
 id VARCHAR(36) PRIMARY KEY, purchase_order_id VARCHAR(36) NOT NULL, product_id VARCHAR(36),
 product_name VARCHAR(255), sku VARCHAR(100), ordered_qty DECIMAL(14,3), received_qty DECIMAL(14,3),
 unit_cost DECIMAL(14,2), gst_rate DECIMAL(12,2), cgst DECIMAL(14,2), sgst DECIMAL(14,2),
 igst DECIMAL(14,2), line_total DECIMAL(14,2),
 CONSTRAINT fk_poi_order FOREIGN KEY(purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE
);
