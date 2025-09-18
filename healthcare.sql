-- Healthcare Platform Database Schema
CREATE DATABASE healthcare_platform;
USE healthcare_platform;

-- Patients table
CREATE TABLE patients (
    patient_id INT PRIMARY KEY AUTO_INCREMENT,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(15) NOT NULL,
    date_of_birth DATE NOT NULL,
    gender ENUM('Male', 'Female', 'Other') NOT NULL,
    address TEXT,
    emergency_contact_name VARCHAR(100),
    emergency_contact_phone VARCHAR(15),
    blood_group VARCHAR(5),
    allergies TEXT,
    medical_history TEXT,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Healthcare professionals table
CREATE TABLE healthcare_professionals (
    professional_id INT PRIMARY KEY AUTO_INCREMENT,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(15) NOT NULL,
    specialization VARCHAR(100) NOT NULL,
    license_number VARCHAR(50) UNIQUE NOT NULL,
    department VARCHAR(100),
    experience_years INT,
    consultation_fee DECIMAL(10,2),
    availability_start TIME DEFAULT '09:00:00',
    availability_end TIME DEFAULT '17:00:00',
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Appointments table
CREATE TABLE appointments (
    appointment_id INT PRIMARY KEY AUTO_INCREMENT,
    patient_id INT NOT NULL,
    professional_id INT NOT NULL,
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    status ENUM('Scheduled', 'Completed', 'Cancelled', 'No-show') DEFAULT 'Scheduled',
    reason TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE,
    FOREIGN KEY (professional_id) REFERENCES healthcare_professionals(professional_id) ON DELETE CASCADE
);

-- Medical records table
CREATE TABLE medical_records (
    record_id INT PRIMARY KEY AUTO_INCREMENT,
    patient_id INT NOT NULL,
    professional_id INT NOT NULL,
    appointment_id INT,
    diagnosis TEXT,
    prescription TEXT,
    lab_results TEXT,
    notes TEXT,
    record_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE,
    FOREIGN KEY (professional_id) REFERENCES healthcare_professionals(professional_id) ON DELETE CASCADE,
    FOREIGN KEY (appointment_id) REFERENCES appointments(appointment_id) ON DELETE SET NULL
);


-- Insert sample healthcare professionals
INSERT INTO healthcare_professionals (first_name, last_name, email, phone, specialization, license_number, department, experience_years, consultation_fee, password_hash) VALUES
('Dr. John', 'Smith', 'john.smith@hospital.com', '+1234567890', 'Cardiology', 'LIC001', 'Cardiology', 15, 150.00, '$2b$10$example_hash_1'),
('Dr. Sarah', 'Johnson', 'sarah.johnson@hospital.com', '+1234567891', 'Pediatrics', 'LIC002', 'Pediatrics', 10, 120.00, '$2b$10$example_hash_2'),
('Dr. Michael', 'Brown', 'michael.brown@hospital.com', '+1234567892', 'Orthopedics', 'LIC003', 'Orthopedics', 12, 180.00, '$2b$10$example_hash_3'),
('Dr. Emily', 'Davis', 'emily.davis@hospital.com', '+1234567893', 'Dermatology', 'LIC004', 'Dermatology', 8, 130.00, '$2b$10$example_hash_4');

-- Create indexes for better performance
CREATE INDEX idx_patient_email ON patients(email);
CREATE INDEX idx_professional_email ON healthcare_professionals(email);
CREATE INDEX idx_appointment_date ON appointments(appointment_date);
CREATE INDEX idx_appointment_patient ON appointments(patient_id);
CREATE INDEX idx_appointment_professional ON appointments(professional_id);