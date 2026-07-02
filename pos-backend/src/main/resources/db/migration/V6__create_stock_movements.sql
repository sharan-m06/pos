CREATE TABLE stock_movements (
 id VARCHAR(36) PRIMARY KEY, product_id VARCHAR(36), product_name VARCHAR(255), type VARCHAR(30),
 quantity DECIMAL(14,3), balance_after DECIMAL(14,3), reference_id VARCHAR(100), reference_type VARCHAR(50),
 movement_date DATE, notes CLOB, created_by VARCHAR(100), created_at TIMESTAMP,
 CONSTRAINT fk_movement_product FOREIGN KEY(product_id) REFERENCES products(id)
);
