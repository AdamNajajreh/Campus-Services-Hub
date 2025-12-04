from flask import Flask, request, jsonify
from flask_cors import CORS
import mysql.connector
import os
from datetime import datetime
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

app = Flask(__name__)
CORS(app)

# Database configuration
db_config = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'user': os.getenv('DB_USER', 'root'),
    'password': os.getenv('DB_PASSWORD', 'rootpassword'),
    'database': os.getenv('DB_NAME', 'notification_db')
}

# Email configuration
EMAIL_CONFIG = {
    'host': os.getenv('EMAIL_HOST', 'smtp.gmail.com'),
    'port': int(os.getenv('EMAIL_PORT', 587)),
    'username': os.getenv('EMAIL_USER', ''),
    'password': os.getenv('EMAIL_PASS', ''),
    'from_email': os.getenv('FROM_EMAIL', 'noreply@campus.edu')
}

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_db_connection():
    return mysql.connector.connect(**db_config)

def send_email_notification(to_email, subject, message):
    """Send email notification"""
    try:
        if not EMAIL_CONFIG['username'] or not EMAIL_CONFIG['password']:
            logger.warning("Email credentials not configured")
            return False
        
        msg = MIMEMultipart()
        msg['From'] = EMAIL_CONFIG['from_email']
        msg['To'] = to_email
        msg['Subject'] = subject
        
        msg.attach(MIMEText(message, 'plain'))
        
        server = smtplib.SMTP(EMAIL_CONFIG['host'], EMAIL_CONFIG['port'])
        server.starttls()
        server.login(EMAIL_CONFIG['username'], EMAIL_CONFIG['password'])
        server.send_message(msg)
        server.quit()
        
        logger.info(f"Email sent to {to_email}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send email: {str(e)}")
        return False

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'service': 'notification-service'}), 200

@app.route('/notifications', methods=['POST'])
def create_notification():
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        message = data.get('message')
        notification_type = data.get('type', 'general')
        priority = data.get('priority', 'medium')
        
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Get user email from user service (in production, use service call)
        # For now, we'll store notification without email
        cursor.execute("""
            INSERT INTO notifications (user_id, message, type, priority, status)
            VALUES (%s, %s, %s, %s, %s)
        """, (user_id, message, notification_type, priority, 'pending'))
        
        notification_id = cursor.lastrowid
        
        # Try to send email if user email is provided
        user_email = data.get('user_email')
        if user_email and notification_type in ['urgent', 'booking_confirmed', 'request_updated']:
            subject = f"Campus Services: {notification_type.replace('_', ' ').title()}"
            email_sent = send_email_notification(user_email, subject, message)
            
            if email_sent:
                cursor.execute("UPDATE notifications SET status = 'sent' WHERE id = %s", (notification_id,))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        logger.info(f"Notification created: {notification_id}")
        return jsonify({
            'message': 'Notification created successfully',
            'notification_id': notification_id
        }), 201
        
    except Exception as e:
        logger.error(f"Create notification error: {str(e)}")
        return jsonify({'message': 'Failed to create notification', 'error': str(e)}), 500

@app.route('/notifications/user/<int:user_id>', methods=['GET'])
def get_user_notifications(user_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute("""
            SELECT * FROM notifications 
            WHERE user_id = %s 
            ORDER BY created_at DESC
            LIMIT 50
        """, (user_id,))
        
        notifications = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        return jsonify(notifications), 200
        
    except Exception as e:
        logger.error(f"Get notifications error: {str(e)}")
        return jsonify({'message': 'Failed to get notifications', 'error': str(e)}), 500

@app.route('/notifications/<int:notification_id>/read', methods=['PUT'])
def mark_as_read(notification_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            UPDATE notifications 
            SET is_read = TRUE, read_at = %s 
            WHERE id = %s
        """, (datetime.now(), notification_id))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({'message': 'Notification marked as read'}), 200
        
    except Exception as e:
        logger.error(f"Mark as read error: {str(e)}")
        return jsonify({'message': 'Failed to mark notification as read', 'error': str(e)}), 500

@app.route('/notifications/unread/count/<int:user_id>', methods=['GET'])
def get_unread_count(user_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT COUNT(*) FROM notifications WHERE user_id = %s AND is_read = FALSE", (user_id,))
        count = cursor.fetchone()[0]
        
        cursor.close()
        conn.close()
        
        return jsonify({'unread_count': count}), 200
        
    except Exception as e:
        logger.error(f"Get unread count error: {str(e)}")
        return jsonify({'message': 'Failed to get unread count', 'error': str(e)}), 500

@app.route('/announcements', methods=['POST'])
def create_announcement():
    try:
        data = request.get_json()
        title = data.get('title')
        content = data.get('content')
        target_audience = data.get('target_audience', 'all')  # all, students, staff
        
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute("""
            INSERT INTO announcements (title, content, target_audience)
            VALUES (%s, %s, %s)
        """, (title, content, target_audience))
        
        announcement_id = cursor.lastrowid
        conn.commit()
        
        # In production, this would trigger notifications to all users
        # For now, we just store the announcement
        
        cursor.close()
        conn.close()
        
        logger.info(f"Announcement created: {announcement_id}")
        return jsonify({
            'message': 'Announcement created successfully',
            'announcement_id': announcement_id
        }), 201
        
    except Exception as e:
        logger.error(f"Create announcement error: {str(e)}")
        return jsonify({'message': 'Failed to create announcement', 'error': str(e)}), 500

@app.route('/announcements', methods=['GET'])
def get_announcements():
    try:
        audience = request.args.get('audience', 'all')
        
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        if audience == 'all':
            cursor.execute("SELECT * FROM announcements ORDER BY created_at DESC LIMIT 20")
        else:
            cursor.execute("""
                SELECT * FROM announcements 
                WHERE target_audience IN (%s, 'all')
                ORDER BY created_at DESC 
                LIMIT 20
            """, (audience,))
        
        announcements = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        return jsonify(announcements), 200
        
    except Exception as e:
        logger.error(f"Get announcements error: {str(e)}")
        return jsonify({'message': 'Failed to get announcements', 'error': str(e)}), 500

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
        CREATE TABLE IF NOT EXISTS notifications (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            message TEXT NOT NULL,
            type VARCHAR(50),
            priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
            status ENUM('pending', 'sent', 'failed') DEFAULT 'pending',
            is_read BOOLEAN DEFAULT FALSE,
            read_at TIMESTAMP NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS announcements (
            id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            content TEXT NOT NULL,
            target_audience ENUM('all', 'students', 'staff') DEFAULT 'all',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Insert sample announcements
    cursor.execute("SELECT COUNT(*) FROM announcements")
    if cursor.fetchone()[0] == 0:
        cursor.execute("""
            INSERT INTO announcements (title, content, target_audience) VALUES
            ('Welcome to Campus Services Hub', 'The new campus services platform is now live! Submit maintenance requests and book rooms easily.', 'all'),
            ('Library Renovation', 'Main library will be closed for renovation from next Monday. Alternative study spaces available.', 'students'),
            ('Staff Meeting', 'Monthly staff meeting scheduled for Friday at 2 PM in Conference Room.', 'staff'),
            ('COVID-19 Guidelines Update', 'Please review the updated campus health and safety guidelines on the portal.', 'all')
        """)
    
    conn.commit()
    cursor.close()
    conn.close()
    
    app.run(host='0.0.0.0', port=5003, debug=True)
