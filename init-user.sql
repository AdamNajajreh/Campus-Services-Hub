-- User Service Database Initialization Script
-- This script creates tables and inserts sample data for the user service

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'staff', 'admin')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM users LIMIT 1) THEN
        INSERT INTO users (email, password, name, role) VALUES
        ('admin@campus.edu', '$2a$12$e1eN.zcq8m67iEooJ0QY0ueVbwN.29V3ZMWlz8KAPbjyQivBsKgSq', 'Admin User', 'admin'),
        ('student@campus.edu', '$2a$12$e1eN.zcq8m67iEooJ0QY0ueVbwN.29V3ZMWlz8KAPbjyQivBsKgSq', 'John Student', 'student'),
        ('staff@campus.edu', '$2a$12$e1eN.zcq8m67iEooJ0QY0ueVbwN.29V3ZMWlz8KAPbjyQivBsKgSq', 'Jane Staff', 'staff');
    END IF;
END $$;

