CREATE TABLE products (
 id VARCHAR(36) PRIMARY KEY, name VARCHAR(255) NOT NULL, sku VARCHAR(100) NOT NULL UNIQUE,
 category VARCHAR(100), gst_rate DECIMAL(12,2) NOT NULL, price DECIMAL(14,2) NOT NULL,
 mrp DECIMAL(14,2), description CLOB, stock DECIMAL(14,3) NOT NULL, cost_price DECIMAL(14,2) NOT NULL,
 unit_type VARCHAR(20), barcode VARCHAR(150) UNIQUE, created_at TIMESTAMP, updated_at TIMESTAMP
);
CREATE TABLE product_serials (
 id VARCHAR(36) PRIMARY KEY, product_id VARCHAR(36) NOT NULL, product_name VARCHAR(255), sku VARCHAR(100),
 barcode VARCHAR(150) UNIQUE, serial_no VARCHAR(150), printed BOOLEAN NOT NULL, printed_at TIMESTAMP,
 created_at TIMESTAMP, CONSTRAINT fk_serial_product FOREIGN KEY(product_id) REFERENCES products(id)
);
