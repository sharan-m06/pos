CREATE TABLE staff (
 id VARCHAR(36) PRIMARY KEY, name VARCHAR(255) NOT NULL, email VARCHAR(255) NOT NULL UNIQUE,
 password_hash VARCHAR(255) NOT NULL, role VARCHAR(30), active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMP
);
CREATE TABLE attendance_records (
 id VARCHAR(36) PRIMARY KEY, staff_id VARCHAR(36), staff_name VARCHAR(255), record_date DATE,
 status VARCHAR(30), notes CLOB, created_at TIMESTAMP,
 CONSTRAINT fk_attendance_staff FOREIGN KEY(staff_id) REFERENCES staff(id),
 CONSTRAINT uk_attendance_staff_date UNIQUE(staff_id, record_date)
);
