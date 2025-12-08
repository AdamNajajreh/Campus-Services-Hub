-- Notification Service Database Initialization Script
-- This script creates tables and inserts sample data for the notification service

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'general',
    priority VARCHAR(50) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create announcements table
CREATE TABLE IF NOT EXISTS announcements (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    target_audience VARCHAR(50) NOT NULL DEFAULT 'all' CHECK (target_audience IN ('all', 'students', 'staff', 'admin')),
    created_by INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

CREATE INDEX IF NOT EXISTS idx_announcements_target_audience ON announcements(target_audience);
CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON announcements(created_at);

-- Insert sample notifications (only if table is empty)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM notifications LIMIT 1) THEN
        INSERT INTO notifications (user_id, message, type, priority, status, is_read, read_at, created_at) VALUES
        (1, 'Welcome to Campus Services Hub! Get started by submitting your first request.', 'system', 'medium', 'sent', FALSE, NULL, '2025-12-01 09:00:00'),
        (2, 'Your room booking for Conference Room has been confirmed for tomorrow at 2 PM.', 'booking_confirmed', 'medium', 'sent', TRUE, '2025-12-02 10:30:00', '2025-12-02 10:00:00'),
        (3, 'Maintenance request #123 status updated to "In Progress".', 'request_update', 'low', 'sent', FALSE, NULL, '2025-12-03 14:15:00'),
        (1, 'Don''t forget: Campus cleanup event this Friday!', 'announcement', 'medium', 'sent', TRUE, '2025-12-03 16:45:00', '2025-12-03 16:30:00'),
        (2, 'URGENT: Library will close early at 5 PM today.', 'urgent', 'high', 'sent', FALSE, NULL, '2025-12-04 08:00:00'),
        (3, 'Your password was changed successfully. If this wasn''t you, please contact support.', 'system', 'high', 'sent', TRUE, '2025-12-04 11:20:00', '2025-12-04 11:00:00');
    END IF;
END $$;

-- Insert sample announcements (only if table is empty)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM announcements LIMIT 1) THEN
        INSERT INTO announcements (title, content, target_audience, created_by, created_at) VALUES
        ('Welcome to Campus Services Hub', 'We are excited to launch the new Campus Services Hub platform! Submit maintenance requests and book rooms with ease.', 'all', 3, '2025-12-01 09:00:00'),
        ('Library Renovation Notice', 'Main library will be closed for renovation from Dec 10-20. Alternative study spaces available in Building B.', 'students', 3, '2025-12-02 14:00:00'),
        ('Staff Meeting Reminder', 'Monthly staff meeting scheduled for Friday at 2 PM in Conference Room. Please bring your reports.', 'staff', 3, '2025-12-03 10:30:00'),
        ('COVID-19 Guidelines Update', 'Please review the updated campus health and safety guidelines on the portal. Masks are recommended in crowded areas.', 'all', 3, '2025-12-04 08:45:00'),
        ('Admin System Maintenance', 'System maintenance scheduled for Sunday, Dec 8, 2-4 AM. Services may be unavailable during this time.', 'admin', 3, '2025-12-04 16:00:00');
    END IF;
END $$;
