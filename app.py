"""
Notification Service for Campus Services Hub
Notification and Announcement Management Microservice
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import psycopg2
from psycopg2.extras import RealDictCursor
import jwt
import logging
import time
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from functools import wraps
from config import Config

# Initialize Flask app
app = Flask(__name__)
CORS(app)
app.config.from_object(Config)

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DatabaseError(Exception):
    """Custom exception for database errors"""
    pass

def get_db_connection():
    """
    Create and return a database connection with retry logic
    """
    max_retries = 3
    retry_delay = 2
    
    for attempt in range(max_retries):
        try:
            conn = psycopg2.connect(
                host=app.config['DB_HOST'],
                port=app.config['DB_PORT'],
                user=app.config['DB_USER'],
                password=app.config['DB_PASSWORD'],
                database=app.config['DB_NAME'],
                connect_timeout=5
            )
            return conn
        except psycopg2.Error as e:
            if attempt < max_retries - 1:
                time.sleep(retry_delay)
            else:
                raise DatabaseError(f"Failed to connect to database after {max_retries} attempts: {str(e)}")

def validate_token(token):
    """
    Validate JWT token and return user data
    """
    try:
        # Decode token using shared secret
        decoded = jwt.decode(
            token,
            app.config['SECRET_KEY'],
            algorithms=["HS256"]
        )
        return True, decoded
    except jwt.ExpiredSignatureError:
        return False, "Token has expired"
    except jwt.InvalidTokenError:
        return False, "Invalid token"
    except Exception as e:
        return False, f"Token validation failed: {str(e)}"

def token_required(f):
    """
    Decorator to protect routes with JWT authentication
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        # Get token from Authorization header
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(" ")[1]
        
        if not token:
            return jsonify({
                'success': False,
                'message': 'Authentication token is missing'
            }), 401
        
        # Validate token
        is_valid, result = validate_token(token)
        if not is_valid:
            return jsonify({
                'success': False,
                'message': result
            }), 401
        
        # Store user data in request context
        request.current_user = result
        return f(*args, **kwargs)
    
    return decorated

def role_required(*roles):
    """
    Decorator to require specific user roles
    """
    def decorator(f):
        @wraps(f)
        @token_required
        def decorated_function(*args, **kwargs):
            user_role = request.current_user.get('role')
            
            if user_role not in roles:
                return jsonify({
                    'success': False,
                    'message': f'Access denied. Required roles: {roles}'
                }), 403
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def send_email_notification(to_email, subject, message_body):
    """
    Send email notification using SMTP
    """
    if not app.config['SEND_EMAIL_ENABLED']:
        return False, "Email sending is not configured"
    
    try:
        # Create message
        msg = MIMEMultipart()
        msg['From'] = app.config['FROM_EMAIL']
        msg['To'] = to_email
        msg['Subject'] = app.config['EMAIL_SUBJECT_PREFIX'] + subject
        
        # Add message body
        msg.attach(MIMEText(message_body, 'plain'))
        
        # Connect to SMTP server and send
        with smtplib.SMTP(app.config['EMAIL_HOST'], app.config['EMAIL_PORT']) as server:
            server.starttls()
            server.login(app.config['EMAIL_USER'], app.config['EMAIL_PASSWORD'])
            server.send_message(msg)
        
        return True, "Email sent successfully"
    except Exception as e:
        return False, f"Failed to send email: {str(e)}"

# ============================
# HEALTH & STATUS ENDPOINTS
# ============================

@app.route('/health', methods=['GET'])
def health_check():
    """
    Health check endpoint with database connectivity test
    """
    try:
        # Test database connection
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        cursor.close()
        conn.close()
        
        return jsonify({
            'status': 'healthy',
            'service': 'notification-service',
            'timestamp': datetime.now().isoformat(),
            'version': '1.0.0',
            'database': 'connected',
            'email_enabled': app.config['SEND_EMAIL_ENABLED']
        }), 200
    except Exception as e:
        return jsonify({
            'status': 'unhealthy',
            'service': 'notification-service',
            'error': str(e),
            'timestamp': datetime.now().isoformat(),
            'database': 'disconnected'
        }), 500

# ============================
# NOTIFICATION ENDPOINTS
# ============================

@app.route('/notifications', methods=['POST'])
def create_notification():
    """
    Create a new notification
    Request body: {user_id, message, type, priority, user_email}
    """
    try:
        data = request.get_json()
        
        # Validate request
        if not data:
            return jsonify({
                'success': False,
                'message': 'Request body is required'
            }), 400
        
        # Extract and validate required fields
        required_fields = ['user_id', 'message']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'success': False,
                    'message': f'{field} is required'
                }), 400
        
        user_id = int(data['user_id'])
        message = data['message'].strip()
        notification_type = data.get('type', app.config['DEFAULT_NOTIFICATION_TYPE'])
        priority = data.get('priority', 'medium')
        user_email = data.get('user_email')
        
        # Validate notification type
        if notification_type not in app.config['VALID_NOTIFICATION_TYPES']:
            return jsonify({
                'success': False,
                'message': f'Notification type must be one of: {", ".join(app.config["VALID_NOTIFICATION_TYPES"])}'
            }), 400
        
        # Validate priority
        if priority not in app.config['VALID_PRIORITIES']:
            return jsonify({
                'success': False,
                'message': f'Priority must be one of: {", ".join(app.config["VALID_PRIORITIES"])}'
            }), 400
        
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Insert new notification
        cursor.execute("""
            INSERT INTO notifications 
            (user_id, message, type, priority, status, created_at)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (
            user_id,
            message,
            notification_type,
            priority,
            'pending',  # Will be updated if email is sent
            datetime.now()
        ))
        
        notification_id = cursor.fetchone()['id']
        
        # Try to send email if email is provided and configured
        email_sent = False
        email_message = ""
        
        if user_email and app.config['SEND_EMAIL_ENABLED']:
            subject = f"Notification: {notification_type.replace('_', ' ').title()}"
            is_sent, email_message = send_email_notification(user_email, subject, message)
            
            if is_sent:
                email_sent = True
                # Update notification status
                cursor.execute("UPDATE notifications SET status = 'sent' WHERE id = %s", (notification_id,))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'Notification created successfully',
            'data': {
                'notification_id': notification_id,
                'email_sent': email_sent,
                'email_message': email_message if not email_sent else None
            }
        }), 201
        
    except DatabaseError as e:
        return jsonify({
            'success': False,
            'message': 'Database error',
            'error': str(e)
        }), 500
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Failed to create notification',
            'error': str(e)
        }), 500

@app.route('/notifications/user/<int:user_id>', methods=['GET'])
@token_required
def get_user_notifications(user_id):
    """
    Get notifications for a specific user
    Query parameters: unread_only, type, limit
    """
    try:
        # Check permissions
        current_user_id = request.current_user['user_id']
        user_role = request.current_user.get('role')
        
        # Users can only view their own notifications (except admin/staff)
        if user_role not in ['staff', 'admin'] and current_user_id != user_id:
            return jsonify({
                'success': False,
                'message': 'Unauthorized access'
            }), 403
        
        # Get query parameters
        unread_only = request.args.get('unread_only', 'false').lower() == 'true'
        notification_type = request.args.get('type')
        limit = int(request.args.get('limit', 50))
        page = int(request.args.get('page', 1))
        
        # Validate pagination
        if page < 1:
            page = 1
        if limit < 1 or limit > 100:
            limit = 50
        
        offset = (page - 1) * limit
        
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Build query
        query = "SELECT * FROM notifications WHERE user_id = %s"
        params = [user_id]
        
        if unread_only:
            query += " AND is_read = FALSE"
        
        if notification_type:
            query += " AND type = %s"
            params.append(notification_type)
        
        # Get total count
        count_query = f"SELECT COUNT(*) as total FROM ({query}) as subquery"
        cursor.execute(count_query, params)
        total = cursor.fetchone()['total']
        
        # Get paginated results
        query += " ORDER BY created_at DESC LIMIT %s OFFSET %s"
        params.extend([limit, offset])
        
        cursor.execute(query, params)
        notifications = cursor.fetchall()
        
        # Convert datetime to ISO format
        for notification in notifications:
            for field in ['created_at', 'read_at']:
                if notification.get(field):
                    notification[field] = notification[field].isoformat()
        
        cursor.close()
        conn.close()
        
        # Calculate pagination info
        total_pages = (total + limit - 1) // limit  # Ceiling division
        
        return jsonify({
            'success': True,
            'data': {
                'notifications': notifications,
                'pagination': {
                    'page': page,
                    'limit': limit,
                    'total': total,
                    'total_pages': total_pages,
                    'has_next': page < total_pages,
                    'has_prev': page > 1
                }
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Failed to retrieve notifications',
            'error': str(e)
        }), 500

@app.route('/notifications/<int:notification_id>/read', methods=['PUT'])
@token_required
def mark_as_read(notification_id):
    """
    Mark a notification as read
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Get notification to check ownership
        cursor.execute("SELECT user_id FROM notifications WHERE id = %s", (notification_id,))
        notification = cursor.fetchone()
        
        if not notification:
            cursor.close()
            conn.close()
            return jsonify({
                'success': False,
                'message': 'Notification not found'
            }), 404
        
        # Check permissions
        current_user_id = request.current_user['user_id']
        user_role = request.current_user.get('role')
        
        # Users can only mark their own notifications as read (except admin/staff)
        if user_role not in ['staff', 'admin'] and notification['user_id'] != current_user_id:
            cursor.close()
            conn.close()
            return jsonify({
                'success': False,
                'message': 'Unauthorized access'
            }), 403
        
        # Mark as read
        cursor.execute("""
            UPDATE notifications 
            SET is_read = TRUE, read_at = %s 
            WHERE id = %s
        """, (datetime.now(), notification_id))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'Notification marked as read'
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Failed to mark notification as read',
            'error': str(e)
        }), 500

@app.route('/notifications/unread/count/<int:user_id>', methods=['GET'])
@token_required
def get_unread_count(user_id):
    """
    Get count of unread notifications for a user
    """
    try:
        # Check permissions
        current_user_id = request.current_user['user_id']
        user_role = request.current_user.get('role')
        
        # Users can only view their own unread count (except admin/staff)
        if user_role not in ['staff', 'admin'] and current_user_id != user_id:
            return jsonify({
                'success': False,
                'message': 'Unauthorized access'
            }), 403
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT COUNT(*) 
            FROM notifications 
            WHERE user_id = %s AND is_read = FALSE
        """, (user_id,))
        
        count = cursor.fetchone()[0]
        
        cursor.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'data': {
                'user_id': user_id,
                'unread_count': count
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Failed to get unread count',
            'error': str(e)
        }), 500

@app.route('/notifications/mark-all-read', methods=['PUT'])
@token_required
def mark_all_as_read():
    """
    Mark all notifications as read for current user
    """
    try:
        user_id = request.current_user['user_id']
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            UPDATE notifications 
            SET is_read = TRUE, read_at = %s 
            WHERE user_id = %s AND is_read = FALSE
        """, (datetime.now(), user_id))
        
        updated_count = cursor.rowcount
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': f'Marked {updated_count} notifications as read'
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Failed to mark notifications as read',
            'error': str(e)
        }), 500

# ============================
# ANNOUNCEMENT ENDPOINTS
# ============================

@app.route('/announcements', methods=['POST'])
@token_required
@role_required('staff', 'admin')
def create_announcement():
    """
    Create a new announcement (staff/admin only)
    Request body: {title, content, target_audience}
    """
    try:
        data = request.get_json()
        
        # Validate request
        if not data:
            return jsonify({
                'success': False,
                'message': 'Request body is required'
            }), 400
        
        # Extract and validate required fields
        required_fields = ['title', 'content']
        for field in required_fields:
            if field not in data or not str(data[field]).strip():
                return jsonify({
                    'success': False,
                    'message': f'{field} is required and cannot be empty'
                }), 400
        
        title = data['title'].strip()
        content = data['content'].strip()
        target_audience = data.get('target_audience', 'all')
        
        # Validate target audience
        if target_audience not in app.config['VALID_TARGET_AUDIENCES']:
            return jsonify({
                'success': False,
                'message': f'Target audience must be one of: {", ".join(app.config["VALID_TARGET_AUDIENCES"])}'
            }), 400
        
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Insert new announcement
        cursor.execute("""
            INSERT INTO announcements 
            (title, content, target_audience, created_by, created_at)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id
        """, (
            title,
            content,
            target_audience,
            request.current_user['user_id'],
            datetime.now()
        ))
        
        announcement_id = cursor.fetchone()['id']
        
        # Create notifications for all users (in a real system, you'd query user service)
        # For now, we'll just create a notification for the announcement creator
        cursor.execute("""
            INSERT INTO notifications 
            (user_id, message, type, priority, created_at)
            VALUES (%s, %s, %s, %s, %s)
        """, (
            request.current_user['user_id'],
            f'Announcement "{title}" has been published.',
            'announcement',
            'medium',
            datetime.now()
        ))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'Announcement created successfully',
            'data': {
                'announcement_id': announcement_id
            }
        }), 201
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Failed to create announcement',
            'error': str(e)
        }), 500

@app.route('/announcements', methods=['GET'])
@token_required
def get_announcements():
    """
    Get announcements with optional filters
    Query parameters: audience, limit, page
    """
    try:
        # Get query parameters
        audience = request.args.get('audience', 'all')
        limit = int(request.args.get('limit', 20))
        page = int(request.args.get('page', 1))
        
        # Validate pagination
        if page < 1:
            page = 1
        if limit < 1 or limit > 100:
            limit = 20
        
        offset = (page - 1) * limit
        
        user_role = request.current_user.get('role')
        
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Build query based on user role and audience
        query = "SELECT * FROM announcements WHERE 1=1"
        params = []
        
        # Filter by audience (users see announcements for their role + 'all')
        if audience != 'all':
            query += " AND target_audience IN (%s, 'all')"
            params.append(audience)
        
        # Get total count
        count_query = f"SELECT COUNT(*) as total FROM ({query}) as subquery"
        cursor.execute(count_query, params)
        total = cursor.fetchone()['total']
        
        # Get paginated results
        query += " ORDER BY created_at DESC LIMIT %s OFFSET %s"
        params.extend([limit, offset])
        
        cursor.execute(query, params)
        announcements = cursor.fetchall()
        
        # Convert datetime to ISO format
        for announcement in announcements:
            if announcement.get('created_at'):
                announcement['created_at'] = announcement['created_at'].isoformat()
        
        cursor.close()
        conn.close()
        
        # Calculate pagination info
        total_pages = (total + limit - 1) // limit  # Ceiling division
        
        return jsonify({
            'success': True,
            'data': {
                'announcements': announcements,
                'pagination': {
                    'page': page,
                    'limit': limit,
                    'total': total,
                    'total_pages': total_pages,
                    'has_next': page < total_pages,
                    'has_prev': page > 1
                }
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Failed to retrieve announcements',
            'error': str(e)
        }), 500

@app.route('/announcements/<int:announcement_id>', methods=['GET'])
@token_required
def get_announcement(announcement_id):
    """
    Get specific announcement by ID
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        cursor.execute("SELECT * FROM announcements WHERE id = %s", (announcement_id,))
        announcement = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        if not announcement:
            return jsonify({
                'success': False,
                'message': 'Announcement not found'
            }), 404
        
        # Check audience permissions
        user_role = request.current_user.get('role')
        target_audience = announcement['target_audience']
        
        if target_audience != 'all' and target_audience != user_role:
            # If announcement is for 'students' and user is 'staff', they can still see it
            # But if announcement is for 'admin' and user is 'student', they cannot
            allowed_roles = ['staff', 'admin'] if target_audience in ['staff', 'admin'] else []
            if user_role not in allowed_roles and target_audience != user_role:
                return jsonify({
                    'success': False,
                    'message': 'You do not have permission to view this announcement'
                }), 403
        
        # Convert datetime to ISO format
        if announcement.get('created_at'):
            announcement['created_at'] = announcement['created_at'].isoformat()
        
        return jsonify({
            'success': True,
            'data': announcement
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Failed to retrieve announcement',
            'error': str(e)
        }), 500

@app.route('/announcements/recent', methods=['GET'])
@token_required
def get_recent_announcements():
    """
    Get recent announcements for the current user (last 7 days)
    """
    try:
        user_role = request.current_user.get('role')
        limit = int(request.args.get('limit', 10))
        
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Get announcements from last 7 days
        cursor.execute("""
            SELECT * FROM announcements 
            WHERE (target_audience = %s OR target_audience = 'all')
            AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            ORDER BY created_at DESC
            LIMIT %s
        """, (user_role, limit))
        
        announcements = cursor.fetchall()
        
        # Convert datetime to ISO format
        for announcement in announcements:
            if announcement.get('created_at'):
                announcement['created_at'] = announcement['created_at'].isoformat()
        
        cursor.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'data': announcements
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Failed to retrieve recent announcements',
            'error': str(e)
        }), 500

# ============================
# EMAIL TEST ENDPOINT (Admin only)
# ============================

@app.route('/test-email', methods=['POST'])
@token_required
@role_required('admin')
def test_email():
    """
    Test email sending functionality (admin only)
    Request body: {email, subject, message}
    """
    try:
        if not app.config['SEND_EMAIL_ENABLED']:
            return jsonify({
                'success': False,
                'message': 'Email sending is not configured. Check EMAIL_USER and EMAIL_PASSWORD in .env'
            }), 400
        
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'message': 'Request body is required'
            }), 400
        
        email = data.get('email')
        subject = data.get('subject', 'Test Email from Notification Service')
        message = data.get('message', 'This is a test email from the Campus Services Notification Service.')
        
        if not email:
            return jsonify({
                'success': False,
                'message': 'Email address is required'
            }), 400
        
        # Send test email
        is_sent, result_message = send_email_notification(email, subject, message)
        
        if is_sent:
            return jsonify({
                'success': True,
                'message': 'Test email sent successfully',
                'data': {
                    'to': email,
                    'subject': subject
                }
            }), 200
        else:
            return jsonify({
                'success': False,
                'message': 'Failed to send test email',
                'error': result_message
            }), 500
            
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Failed to send test email',
            'error': str(e)
        }), 500

# ============================
# STATISTICS ENDPOINTS
# ============================

@app.route('/notifications/stats', methods=['GET'])
@token_required
@role_required('staff', 'admin')
def get_notification_statistics():
    """
    Get notification statistics (staff/admin only)
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Get basic statistics
        cursor.execute("""
            SELECT 
                COUNT(*) as total_notifications,
                SUM(CASE WHEN is_read = TRUE THEN 1 ELSE 0 END) as read_count,
                SUM(CASE WHEN is_read = FALSE THEN 1 ELSE 0 END) as unread_count,
                MIN(created_at) as oldest_notification,
                MAX(created_at) as newest_notification,
                AVG(CASE WHEN is_read = TRUE THEN TIMESTAMPDIFF(MINUTE, created_at, read_at) ELSE NULL END) as avg_minutes_to_read
            FROM notifications
        """)
        stats = cursor.fetchone()
        
        # Get statistics by type
        cursor.execute("""
            SELECT 
                type,
                COUNT(*) as count,
                SUM(CASE WHEN is_read = TRUE THEN 1 ELSE 0 END) as read_count,
                SUM(CASE WHEN is_read = FALSE THEN 1 ELSE 0 END) as unread_count
            FROM notifications
            GROUP BY type
            ORDER BY count DESC
        """)
        type_stats = cursor.fetchall()
        
        # Get statistics by priority
        cursor.execute("""
            SELECT 
                priority,
                COUNT(*) as count
            FROM notifications
            GROUP BY priority
        """)
        priority_stats = cursor.fetchall()
        
        # Get announcement statistics
        cursor.execute("""
            SELECT 
                target_audience,
                COUNT(*) as count,
                MIN(created_at) as oldest,
                MAX(created_at) as newest
            FROM announcements
            GROUP BY target_audience
        """)
        announcement_stats = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        # Convert datetime to ISO format
        for stat in [stats] + announcement_stats:
            for field in ['oldest_notification', 'newest_notification', 'oldest', 'newest']:
                if stat and stat.get(field):
                    stat[field] = stat[field].isoformat()
        
        return jsonify({
            'success': True,
            'data': {
                'notifications': stats,
                'by_type': type_stats,
                'by_priority': priority_stats,
                'announcements': announcement_stats
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Failed to retrieve statistics',
            'error': str(e)
        }), 500

# ============================
# DATABASE INITIALIZATION
# ============================

# Database initialization is now handled by init.sql script
# This function is kept for backward compatibility but does nothing
def init_database():
    """Database initialization is handled by init.sql script on Docker start"""
    logger.info("Database initialization is handled by init.sql script")
    return True

# ============================
# ERROR HANDLERS
# ============================

@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors"""
    return jsonify({
        'success': False,
        'message': 'Endpoint not found'
    }), 404

@app.errorhandler(405)
def method_not_allowed(error):
    """Handle 405 errors"""
    return jsonify({
        'success': False,
        'message': 'Method not allowed'
    }), 405

@app.errorhandler(500)
def internal_error(error):
    """Handle 500 errors"""
    return jsonify({
        'success': False,
        'message': 'Internal server error'
    }), 500

# ============================
# APPLICATION STARTUP
# ============================

if __name__ == '__main__':
    try:
        # Database initialization is handled by init.sql script
        # Just verify connection on startup
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT 1")
            cursor.close()
            conn.close()
            logger.info("Database connection verified successfully")
        except Exception as e:
            logger.warning(f"Database connection check failed: {str(e)}")
            logger.warning("Make sure PostgreSQL is running and init.sql has been executed")
        
        app.run(
            host='0.0.0.0',
            port=app.config['PORT'],
            debug=app.config['DEBUG'],
            threaded=True
        )
    except KeyboardInterrupt:
        logger.info("Service stopped by user")
    except Exception as e:
        logger.error(f"Failed to start service: {str(e)}")