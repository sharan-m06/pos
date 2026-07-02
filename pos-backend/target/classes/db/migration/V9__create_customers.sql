CREATE TABLE customers (
 id VARCHAR(36) PRIMARY KEY, name VARCHAR(255) NOT NULL, phone VARCHAR(50), email VARCHAR(255),
 address CLOB, gstin VARCHAR(50), notes CLOB, created_at TIMESTAMP
);
