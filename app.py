from flask import Flask, request, jsonify
from flask_cors import CORS
import mysql.connector
import os
from datetime import datetime
import logging
import requests

app = Flask(__name__)
CORS(app)

# Database configuration
db_config = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'user': os.getenv('DB_USER', 'root'),
    'password': os.getenv('DB_PASSWORD', 'rootpassword'),
    'database': os.getenv('DB_NAME', 'request_db')
}

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_db_connection():
    return mysql.connector.connect(**db_config)

def validate_user(token):
    """Validate user token with user service"""
    try:
        # In production, use service discovery or environment variable
        user_service_url = os.getenv('USER_SERVICE_URL', 'http://user-service:5000')
        headers = {'Authorization': f'Bearer {token}'}
        response = requests.get(f'{user_service_url}/users/me', headers=headers)
        return response.status_code == 200, response.json() if response.status_code == 200 else None
    except:
        return False, None

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'service': 'request-service'}), 200

@app.route('/requests', methods=['POST'])
def create_request():
    try:
        data = request.get_json()
        token = request.headers.get('Authorization', '').split(' ')[1] if 'Authorization' in request.headers else None
        
        if not token:
            return jsonify({'message': 'Authentication required'}), 401
        
        is_valid, user_data = validate_user(token)
        if not is_valid:
            return jsonify({'message': 'Invalid token'}), 401
        
        title = data.get('title')
        description = data.get('description')
        category = data.get('category', 'maintenance')
        location = data.get('location')
        priority = data.get('priority', 'medium')
        
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute("""
            INSERT INTO service_requests 
            (user_id, title, description, category, location, priority, status, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """, (user_data['id'], title, description, category, location, priority, 'pending', datetime.now()))
        
        request_id = cursor.lastrowid
        
        # Send notification
        try:
            notification_data = {
                'user_id': user_data['id'],
                'message': f'Your service request "{title}" has been submitted successfully.',
                'type': 'request_created'
            }
            requests.post('http://notification-service:5000/notifications', 
                         json=notification_data)
        except:
            logger.warning("Failed to send notification")
        
        conn.commit()
        cursor.close()
        conn.close()
        
        logger.info(f"Request created: {request_id}")
        return jsonify({
            'message': 'Service request created successfully',
            'request_id': request_id
        }), 201
        
    except Exception as e:
        logger.error(f"Create request error: {str(e)}")
        return jsonify({'message': 'Failed to create request', 'error': str(e)}), 500

@app.route('/requests', methods=['GET'])
def get_requests():
    try:
        token = request.headers.get('Authorization', '').split(' ')[1] if 'Authorization' in request.headers else None
        user_id = request.args.get('user_id')
        
        if not token:
            return jsonify({'message': 'Authentication required'}), 401
        
        is_valid, user_data = validate_user(token)
        if not is_valid:
            return jsonify({'message': 'Invalid token'}), 401
        
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        if user_id and user_data['role'] in ['staff', 'admin']:
            cursor.execute("""
                SELECT * FROM service_requests WHERE user_id = %s ORDER BY created_at DESC
            """, (user_id,))
        elif user_data['role'] in ['staff', 'admin']:
            cursor.execute("SELECT * FROM service_requests ORDER BY created_at DESC")
        else:
            cursor.execute("""
                SELECT * FROM service_requests WHERE user_id = %s ORDER BY created_at DESC
            """, (user_data['id'],))
        
        requests_list = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        return jsonify(requests_list), 200
        
    except Exception as e:
        logger.error(f"Get requests error: {str(e)}")
        return jsonify({'message': 'Failed to get requests', 'error': str(e)}), 500

@app.route('/requests/<int:request_id>', methods=['GET'])
def get_request(request_id):
    try:
        token = request.headers.get('Authorization', '').split(' ')[1] if 'Authorization' in request.headers else None
        
        if not token:
            return jsonify({'message': 'Authentication required'}), 401
        
        is_valid, user_data = validate_user(token)
        if not is_valid:
            return jsonify({'message': 'Invalid token'}), 401
        
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute("SELECT * FROM service_requests WHERE id = %s", (request_id,))
        request_data = cursor.fetchone()
        
        if not request_data:
            return jsonify({'message': 'Request not found'}), 404
        
        # Check authorization
        if user_data['role'] not in ['staff', 'admin'] and request_data['user_id'] != user_data['id']:
            return jsonify({'message': 'Unauthorized access'}), 403
        
        cursor.close()
        conn.close()
        
        return jsonify(request_data), 200
        
    except Exception as e:
        logger.error(f"Get request error: {str(e)}")
        return jsonify({'message': 'Failed to get request', 'error': str(e)}), 500

@app.route('/requests/<int:request_id>/status', methods=['PUT'])
def update_request_status(request_id):
    try:
        token = request.headers.get('Authorization', '').split(' ')[1] if 'Authorization' in request.headers else None
        
        if not token:
            return jsonify({'message': 'Authentication required'}), 401
        
        is_valid, user_data = validate_user(token)
        if not is_valid:
            return jsonify({'message': 'Invalid token'}), 401
        
        # Only staff/admin can update status
        if user_data['role'] not in ['staff', 'admin']:
            return jsonify({'message': 'Unauthorized access'}), 403
        
        data = request.get_json()
        status = data.get('status')
        admin_notes = data.get('admin_notes')
        
        if status not in ['pending', 'in_progress', 'completed', 'cancelled']:
            return jsonify({'message': 'Invalid status'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute("""
            UPDATE service_requests 
            SET status = %s, admin_notes = %s, updated_at = %s, assigned_to = %s
            WHERE id = %s
        """, (status, admin_notes, datetime.now(), user_data['id'], request_id))
        
        # Send notification
        try:
            cursor.execute("SELECT user_id, title FROM service_requests WHERE id = %s", (request_id,))
            req_data = cursor.fetchone()
            
            notification_data = {
                'user_id': req_data['user_id'],
                'message': f'Your service request "{req_data["title"]}" status updated to {status}.',
                'type': 'request_updated'
            }
            requests.post('http://notification-service:5000/notifications', 
                         json=notification_data)
        except:
            logger.warning("Failed to send notification")
        
        conn.commit()
        cursor.close()
        conn.close()
        
        logger.info(f"Request status updated: {request_id} -> {status}")
        return jsonify({'message': 'Request status updated successfully'}), 200
        
    except Exception as e:
        logger.error(f"Update request status error: {str(e)}")
        return jsonify({'message': 'Failed to update request status', 'error': str(e)}), 500

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
        CREATE TABLE IF NOT EXISTS service_requests (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            category ENUM('maintenance', 'cleaning', 'it_support', 'facilities', 'other') DEFAULT 'maintenance',
            location VARCHAR(255),
            priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
            status ENUM('pending', 'in_progress', 'completed', 'cancelled') DEFAULT 'pending',
            admin_notes TEXT,
            assigned_to INT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP
        )
    """)
    
    conn.commit()
    cursor.close()
    conn.close()
    
    app.run(host='0.0.0.0', port=5001, debug=True)
