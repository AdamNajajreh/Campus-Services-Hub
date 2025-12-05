from flask import Flask, request, jsonify
from flask_cors import CORS
import mysql.connector
import os
from datetime import datetime, timedelta
import logging
import requests
from config import Config
from dotenv import load_dotenv
load_dotenv()  # Add this near the top of app.py
app = Flask(__name__)
CORS(app)

# Database configuration

db_config = {
    'host': Config.DB_HOST,
    'user': Config.DB_USER,
    'password': Config.DB_PASSWORD,
    'database': Config.DB_NAME
}

# Then in validate_user function:
user_service_url = Config.USER_SERVICE_URL

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_db_connection():
    return mysql.connector.connect(**db_config)

def validate_user(token):
    """Validate user token with user service"""
    try:
        user_service_url = os.getenv('USER_SERVICE_URL', 'http://user-service:5000')
        headers = {'Authorization': f'Bearer {token}'}
        response = requests.get(f'{user_service_url}/users/me', headers=headers)
        return response.status_code == 200, response.json() if response.status_code == 200 else None
    except:
        return False, None

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'service': 'booking-service'}), 200

@app.route('/rooms', methods=['GET'])
def get_rooms():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute("SELECT * FROM rooms WHERE is_available = TRUE")
        rooms = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        return jsonify(rooms), 200
        
    except Exception as e:
        logger.error(f"Get rooms error: {str(e)}")
        return jsonify({'message': 'Failed to get rooms', 'error': str(e)}), 500

@app.route('/rooms/<int:room_id>/availability', methods=['GET'])
def check_availability(room_id):
    try:
        date = request.args.get('date', datetime.now().date().isoformat())
        
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute("""
            SELECT start_time, end_time FROM bookings 
            WHERE room_id = %s AND DATE(start_time) = %s AND status != 'cancelled'
        """, (room_id, date))
        
        bookings = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        return jsonify({'bookings': bookings}), 200
        
    except Exception as e:
        logger.error(f"Check availability error: {str(e)}")
        return jsonify({'message': 'Failed to check availability', 'error': str(e)}), 500

@app.route('/bookings', methods=['POST'])
def create_booking():
    try:
        data = request.get_json()
        token = request.headers.get('Authorization', '').split(' ')[1] if 'Authorization' in request.headers else None
        
        if not token:
            return jsonify({'message': 'Authentication required'}), 401
        
        is_valid, user_data = validate_user(token)
        if not is_valid:
            return jsonify({'message': 'Invalid token'}), 401
        
        room_id = data.get('room_id')
        start_time = data.get('start_time')
        end_time = data.get('end_time')
        purpose = data.get('purpose', '')
        
        # Validate time
        start_dt = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
        end_dt = datetime.fromisoformat(end_time.replace('Z', '+00:00'))
        
        if end_dt <= start_dt:
            return jsonify({'message': 'End time must be after start time'}), 400
        
        if (end_dt - start_dt).total_seconds() > 4 * 3600:  # Max 4 hours
            return jsonify({'message': 'Booking cannot exceed 4 hours'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Check room availability
        cursor.execute("""
            SELECT id FROM bookings 
            WHERE room_id = %s AND status != 'cancelled' AND (
                (start_time < %s AND end_time > %s) OR
                (start_time >= %s AND start_time < %s)
            )
        """, (room_id, end_time, start_time, start_time, end_time))
        
        if cursor.fetchone():
            return jsonify({'message': 'Room is already booked for this time slot'}), 409
        
        # Create booking
        cursor.execute("""
            INSERT INTO bookings (user_id, room_id, start_time, end_time, purpose, status)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (user_data['id'], room_id, start_time, end_time, purpose, 'confirmed'))
        
        booking_id = cursor.lastrowid
        
        # Send notification
        try:
            cursor.execute("SELECT name FROM rooms WHERE id = %s", (room_id,))
            room = cursor.fetchone()
            
            notification_data = {
                'user_id': user_data['id'],
                'message': f'Your booking for {room["name"]} has been confirmed.',
                'type': 'booking_confirmed'
            }
            requests.post('http://notification-service:5000/notifications', 
                         json=notification_data)
        except:
            logger.warning("Failed to send notification")
        
        conn.commit()
        cursor.close()
        conn.close()
        
        logger.info(f"Booking created: {booking_id}")
        return jsonify({
            'message': 'Booking created successfully',
            'booking_id': booking_id
        }), 201
        
    except Exception as e:
        logger.error(f"Create booking error: {str(e)}")
        return jsonify({'message': 'Failed to create booking', 'error': str(e)}), 500

@app.route('/bookings', methods=['GET'])
def get_bookings():
    try:
        token = request.headers.get('Authorization', '').split(' ')[1] if 'Authorization' in request.headers else None
        
        if not token:
            return jsonify({'message': 'Authentication required'}), 401
        
        is_valid, user_data = validate_user(token)
        if not is_valid:
            return jsonify({'message': 'Invalid token'}), 401
        
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        if user_data['role'] in ['staff', 'admin']:
            cursor.execute("""
                SELECT b.*, r.name as room_name, r.type as room_type 
                FROM bookings b
                JOIN rooms r ON b.room_id = r.id
                ORDER BY b.start_time DESC
            """)
        else:
            cursor.execute("""
                SELECT b.*, r.name as room_name, r.type as room_type 
                FROM bookings b
                JOIN rooms r ON b.room_id = r.id
                WHERE b.user_id = %s
                ORDER BY b.start_time DESC
            """, (user_data['id'],))
        
        bookings = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        return jsonify(bookings), 200
        
    except Exception as e:
        logger.error(f"Get bookings error: {str(e)}")
        return jsonify({'message': 'Failed to get bookings', 'error': str(e)}), 500

@app.route('/bookings/<int:booking_id>', methods=['DELETE'])
def cancel_booking(booking_id):
    try:
        token = request.headers.get('Authorization', '').split(' ')[1] if 'Authorization' in request.headers else None
        
        if not token:
            return jsonify({'message': 'Authentication required'}), 401
        
        is_valid, user_data = validate_user(token)
        if not is_valid:
            return jsonify({'message': 'Invalid token'}), 401
        
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute("SELECT * FROM bookings WHERE id = %s", (booking_id,))
        booking = cursor.fetchone()
        
        if not booking:
            return jsonify({'message': 'Booking not found'}), 404
        
        # Check authorization
        if user_data['role'] not in ['staff', 'admin'] and booking['user_id'] != user_data['id']:
            return jsonify({'message': 'Unauthorized access'}), 403
        
        # Check if booking can be cancelled (at least 1 hour before)
        start_time = booking['start_time']
        if isinstance(start_time, str):
            start_time = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
        
        if datetime.now() + timedelta(hours=1) > start_time:
            return jsonify({'message': 'Booking can only be cancelled at least 1 hour before start time'}), 400
        
        cursor.execute("""
            UPDATE bookings SET status = 'cancelled', updated_at = %s 
            WHERE id = %s
        """, (datetime.now(), booking_id))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        logger.info(f"Booking cancelled: {booking_id}")
        return jsonify({'message': 'Booking cancelled successfully'}), 200
        
    except Exception as e:
        logger.error(f"Cancel booking error: {str(e)}")
        return jsonify({'message': 'Failed to cancel booking', 'error': str(e)}), 500

if __name__ == '__main__':
    # Initialize database
    conn = mysql.connector.connect(
        host=db_config['host'],
        user=db_config['user'],
        password=db_config['password']
    )
    cursor = conn.cursor()
    
    cursor.execute(f"CREATE DATABASE IF NOT EXISTS {db_config['database']}")
    cursor.close()
    conn.close()
    
    # Create tables
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS rooms (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            type ENUM('classroom', 'lab', 'meeting_room', 'auditorium', 'other') DEFAULT 'classroom',
            capacity INT NOT NULL,
            location VARCHAR(255),
            equipment TEXT,
            is_available BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS bookings (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            room_id INT NOT NULL,
            start_time DATETIME NOT NULL,
            end_time DATETIME NOT NULL,
            purpose VARCHAR(255),
            status ENUM('pending', 'confirmed', 'cancelled', 'completed') DEFAULT 'confirmed',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (room_id) REFERENCES rooms(id)
        )
    """)
    
    # Insert sample rooms
    cursor.execute("SELECT COUNT(*) FROM rooms")
    if cursor.fetchone()[0] == 0:
        cursor.execute("""
            INSERT INTO rooms (name, type, capacity, location, equipment) VALUES
            ('Room 101', 'classroom', 30, 'Main Building - First Floor', 'Projector, Whiteboard'),
            ('Computer Lab A', 'lab', 25, 'Tech Building - Ground Floor', '25 Computers, Projector'),
            ('Conference Room', 'meeting_room', 10, 'Admin Building - Second Floor', 'TV, Whiteboard, Phone'),
            ('Chemistry Lab', 'lab', 20, 'Science Building - First Floor', 'Lab Equipment, Fume Hood'),
            ('Auditorium', 'auditorium', 200, 'Main Building - Ground Floor', 'Stage, Sound System, Projector')
        """)
    
    conn.commit()
    cursor.close()
    conn.close()
    
    app.run(host='0.0.0.0', port=5001, debug=True)
