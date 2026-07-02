CREATE TABLE expenses (
 id VARCHAR(36) PRIMARY KEY, category VARCHAR(40), description VARCHAR(1000), amount DECIMAL(14,2),
 payment_mode VARCHAR(40), vendor VARCHAR(255), expense_date DATE, receipt_no VARCHAR(100),
 notes CLOB, created_by VARCHAR(100), created_at TIMESTAMP
);
