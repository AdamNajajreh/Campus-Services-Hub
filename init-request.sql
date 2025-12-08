-- Request Service Database Initialization Script
-- This script creates tables and inserts sample data for the request service

-- Create service_requests table
CREATE TABLE IF NOT EXISTS service_requests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'maintenance' CHECK (category IN ('maintenance', 'cleaning', 'it_support', 'facilities', 'other')),
    location VARCHAR(255),
    priority VARCHAR(50) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    admin_notes TEXT,
    assigned_to INTEGER,
    estimated_completion_date DATE,
    actual_completion_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_service_requests_user_id ON service_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_status ON service_requests(status);
CREATE INDEX IF NOT EXISTS idx_service_requests_category ON service_requests(category);
CREATE INDEX IF NOT EXISTS idx_service_requests_priority ON service_requests(priority);
CREATE INDEX IF NOT EXISTS idx_service_requests_assigned_to ON service_requests(assigned_to);
CREATE INDEX IF NOT EXISTS idx_service_requests_created_at ON service_requests(created_at);

-- Insert sample requests (only if table is empty)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM service_requests LIMIT 1) THEN
        INSERT INTO service_requests (user_id, title, description, category, location, priority, status, admin_notes, assigned_to, estimated_completion_date, actual_completion_date) VALUES
        (1, 'Leaking faucet', 'Faucet in bathroom keeps dripping all night', 'maintenance', 'Science Building, Room 201', 'medium', 'completed', 'Fixed by maintenance team', 2, '2025-12-05', '2025-12-04 14:30:00'),
        (3, 'Broken chair', 'Office chair in room 105 is broken', 'maintenance', 'Admin Building, Room 105', 'low', 'in_progress', 'Waiting for replacement parts', 2, '2025-12-10', NULL),
        (2, 'Room cleaning needed', 'Classroom needs cleaning after lab session', 'cleaning', 'Main Building, Room 301', 'medium', 'pending', NULL, NULL, NULL, NULL),
        (1, 'Projector not working', 'Projector in lecture hall shows no display', 'it_support', 'Lecture Hall A', 'high', 'pending', NULL, NULL, NULL, NULL),
        (4, 'Printer paper needed', 'Printer in library out of paper', 'facilities', 'Library, 2nd floor', 'low', 'completed', 'Restocked paper', 3, '2025-12-03', '2025-12-03 10:15:00'),
        (5, 'Window broken', 'Window pane cracked in lab', 'maintenance', 'Chemistry Lab, Room 204', 'urgent', 'in_progress', 'Safety issue - needs immediate attention', 2, '2025-12-05', NULL);
    END IF;
END $$;