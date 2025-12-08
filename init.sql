-- Booking Service Database Initialization Script
-- This script creates tables and inserts sample data for the booking service
-- It should be executed when the PostgreSQL container starts (via docker-entrypoint-initdb.d)
-- or manually when setting up the database

-- Create rooms table
CREATE TABLE IF NOT EXISTS rooms (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'classroom' CHECK (type IN ('classroom', 'lab', 'meeting_room', 'auditorium', 'other')),
    capacity INTEGER NOT NULL,
    location VARCHAR(255),
    equipment TEXT,
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create bookings table
CREATE TABLE IF NOT EXISTS bookings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    room_id INTEGER NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    purpose VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    CONSTRAINT fk_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_room_id ON bookings(room_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_start_time ON bookings(start_time);

-- Insert sample rooms (only if table is empty)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM rooms LIMIT 1) THEN
        INSERT INTO rooms (name, type, capacity, location, equipment) VALUES
        ('Room 101', 'classroom', 30, 'Main Building - First Floor', 'Projector, Whiteboard'),
        ('Computer Lab A', 'lab', 25, 'Tech Building - Ground Floor', '25 Computers, Projector'),
        ('Conference Room', 'meeting_room', 10, 'Admin Building - Second Floor', 'TV, Whiteboard, Phone'),
        ('Chemistry Lab', 'lab', 20, 'Science Building - First Floor', 'Lab Equipment, Fume Hood'),
        ('Auditorium', 'auditorium', 200, 'Main Building - Ground Floor', 'Stage, Sound System, Projector');
    END IF;
END $$;
