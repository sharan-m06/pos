CREATE TABLE ledger_entries (
 id VARCHAR(36) PRIMARY KEY, entry_date DATE, account_type VARCHAR(100), account_name VARCHAR(255),
 party_id VARCHAR(36), description CLOB, debit DECIMAL(14,2), credit DECIMAL(14,2),
 balance DECIMAL(14,2), reference_id VARCHAR(100), reference_type VARCHAR(50), created_at TIMESTAMP
);
CREATE INDEX idx_ledger_account_created ON ledger_entries(account_type, created_at);
