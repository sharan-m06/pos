CREATE TABLE suppliers (
 id VARCHAR(36) PRIMARY KEY, name VARCHAR(255) NOT NULL, contact_person VARCHAR(255), phone VARCHAR(50),
 email VARCHAR(255), address CLOB, gstin VARCHAR(50), payment_terms VARCHAR(20), notes CLOB,
 active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMP
);
