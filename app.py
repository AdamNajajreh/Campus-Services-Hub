"""
User Service for Campus Services Hub
Authentication and User Management Microservice
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import mysql.connector
import jwt
import bcrypt
import os
import time
import logging
from datetime import datetime, timedelta
from functools import wraps
from config import Config

# Initialize Flask app
app = Flask(__name__)
CORS(app)
app.config.from_object(Config)

# Setup structured logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - [%(correlation_id)s] - %(message)s',
    handlers=[
        logging.FileHandler('user_service.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Middleware to add correlation ID
@app.before_request
def before_request():
    """Add correlation ID to each request for tracing"""
    request.correlation_id = request.headers.get('X-Correlation-ID', 'N/A')

class DatabaseError(Exception):
    """Custom exception for database errors"""
    pass

class AuthError(Exception):
    """Custom exception for authentication errors"""
    pass

def get_db_connection():
    """
    Create and return a database connection with retry logic
    """
    max_retries = 3
    retry_delay = 2
    
    for attempt in range(max_retries):
        try:
            conn = mysql.connector.connect(
                host=app.config['MYSQL_HOST'],
                user=app.config['MYSQL_USER'],
                password=app.config['MYSQL_PASSWORD'],
                database=app.config['MYSQL_DB'],
                connection_timeout=5,
                pool_name="user_pool",
                pool_size=5
            )
            logger.info(f"Database connection established to {app.config['MYSQL_HOST']}")
            return conn
        except mysql.connector.Error as e:
            logger.warning(f"Database connection attempt {attempt + 1} failed: {str(e)}")
            if attempt < max_retries - 1:
                time.sleep(retry_delay)
            else:
                raise DatabaseError(f"Failed to connect to database after {max_retries} attempts: {str(e)}")

def get_root_connection():
    """Get connection without database for initialization"""
    try:
        return mysql.connector.connect(
            host=app.config['MYSQL_HOST'],
            user=app.config['MYSQL_USER'],
            password=app.config['MYSQL_PASSWORD']
        )
    except mysql.connector.Error as e:
        raise DatabaseError(f"Cannot connect to MySQL server: {str(e)}")

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
            logger.warning("Authentication failed: No token provided")
            return jsonify({
                'success': False,
                'message': 'Authentication token is missing',
                'correlation_id': request.correlation_id
            }), 401
        
        try:
            # Decode token
            data = jwt.decode(
                token, 
                app.config['SECRET_KEY'], 
                algorithms=["HS256"]
            )
            request.current_user = data
            
            # Log successful authentication
            logger.info(f"User authenticated: {data.get('email')} (ID: {data.get('user_id')})")
            
        except jwt.ExpiredSignatureError:
            logger.warning("Authentication failed: Token expired")
            return jsonify({
                'success': False,
                'message': 'Token has expired',
                'correlation_id': request.correlation_id
            }), 401
        except jwt.InvalidTokenError:
            logger.warning("Authentication failed: Invalid token")
            return jsonify({
                'success': False,
                'message': 'Invalid token',
                'correlation_id': request.correlation_id
            }), 401
        except Exception as e:
            logger.error(f"Token validation error: {str(e)}")
            return jsonify({
                'success': False,
                'message': 'Token validation failed',
                'correlation_id': request.correlation_id
            }), 401
        
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
                logger.warning(f"Authorization failed: User {request.current_user.get('email')} with role {user_role} tried to access {request.path}")
                return jsonify({
                    'success': False,
                    'message': f'Access denied. Required roles: {roles}',
                    'correlation_id': request.correlation_id
                }), 403
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def validate_email(email):
    """Validate email format"""
    import re
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def validate_password(password):
    """Validate password strength"""
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    if not any(char.isdigit() for char in password):
        return False, "Password must contain at least one digit"
    if not any(char.isalpha() for char in password):
        return False, "Password must contain at least one letter"
    return True, "Password is valid"

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
            'service': 'user-service',
            'timestamp': datetime.now().isoformat(),
            'version': '1.0.0',
            'database': 'connected'
        }), 200
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return jsonify({
            'status': 'unhealthy',
            'service': 'user-service',
            'error': str(e),
            'timestamp': datetime.now().isoformat(),
            'database': 'disconnected'
        }), 500

@app.route('/status', methods=['GET'])
@token_required
@role_required('admin')
def service_status():
    """
    Detailed service status (admin only)
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Get user statistics
        cursor.execute("""
            SELECT 
                COUNT(*) as total_users,
                SUM(CASE WHEN role = 'student' THEN 1 ELSE 0 END) as students,
                SUM(CASE WHEN role = 'staff' THEN 1 ELSE 0 END) as staff,
                SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as admins,
                MIN(created_at) as oldest_user,
                MAX(created_at) as newest_user
            FROM users
        """)
        stats = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'service': 'user-service',
            'status': 'operational',
            'statistics': stats,
            'timestamp': datetime.now().isoformat()
        }), 200
    except Exception as e:
        logger.error(f"Status check failed: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# ============================
# AUTHENTICATION ENDPOINTS
# ============================

@app.route('/register', methods=['POST'])
def register():
    """
    Register a new user
    Request body: {email, password, name, role}
    """
    try:
        data = request.get_json()
        
        # Validate request
        if not data:
            return jsonify({
                'success': False,
                'message': 'Request body is required',
                'correlation_id': request.correlation_id
            }), 400
        
        # Extract and validate required fields
        required_fields = ['email', 'password', 'name']
        for field in required_fields:
            if field not in data or not str(data[field]).strip():
                return jsonify({
                    'success': False,
                    'message': f'{field} is required and cannot be empty',
                    'correlation_id': request.correlation_id
                }), 400
        
        email = data['email'].strip().lower()
        password = data['password']
        name = data['name'].strip()
        role = data.get('role', 'student').lower()
        
        # Validate email format
        if not validate_email(email):
            return jsonify({
                'success': False,
                'message': 'Invalid email format',
                'correlation_id': request.correlation_id
            }), 400
        
        # Validate password strength
        is_valid_password, password_message = validate_password(password)
        if not is_valid_password:
            return jsonify({
                'success': False,
                'message': password_message,
                'correlation_id': request.correlation_id
            }), 400
        
        # Validate role
        valid_roles = ['student', 'staff', 'admin']
        if role not in valid_roles:
            return jsonify({
                'success': False,
                'message': f'Role must be one of: {", ".join(valid_roles)}',
                'correlation_id': request.correlation_id
            }), 400
        
        # Hash password
        hashed_password = bcrypt.hashpw(
            password.encode('utf-8'), 
            bcrypt.gensalt()
        ).decode('utf-8')
        
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Check if user already exists
        cursor.execute("SELECT id FROM users WHERE email = %s", (email,))
        existing_user = cursor.fetchone()
        
        if existing_user:
            cursor.close()
            conn.close()
            logger.warning(f"Registration failed: User {email} already exists")
            return jsonify({
                'success': False,
                'message': 'User with this email already exists',
                'correlation_id': request.correlation_id
            }), 409
        
        # Insert new user
        cursor.execute("""
            INSERT INTO users (email, password, name, role, created_at)
            VALUES (%s, %s, %s, %s, %s)
        """, (email, hashed_password, name, role, datetime.now()))
        
        user_id = cursor.lastrowid
        
        # Generate JWT token
        token_payload = {
            'user_id': user_id,
            'email': email,
            'name': name,
            'role': role,
            'exp': datetime.utcnow() + timedelta(hours=24)
        }
        token = jwt.encode(token_payload, app.config['SECRET_KEY'])
        
        conn.commit()
        
        cursor.close()
        conn.close()
        
        logger.info(f"User registered successfully: {email} (ID: {user_id}, Role: {role})")
        
        return jsonify({
            'success': True,
            'message': 'User registered successfully',
            'data': {
                'token': token,
                'user': {
                    'id': user_id,
                    'email': email,
                    'name': name,
                    'role': role
                }
            },
            'correlation_id': request.correlation_id
        }), 201
        
    except DatabaseError as e:
        logger.error(f"Database error during registration: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Database error',
            'error': str(e),
            'correlation_id': request.correlation_id
        }), 500
    except Exception as e:
        logger.error(f"Registration error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Registration failed',
            'error': str(e),
            'correlation_id': request.correlation_id
        }), 500

@app.route('/login', methods=['POST'])
def login():
    """
    User login
    Request body: {email, password}
    """
    try:
        data = request.get_json()
        
        # Validate request
        if not data:
            return jsonify({
                'success': False,
                'message': 'Request body is required',
                'correlation_id': request.correlation_id
            }), 400
        
        if 'email' not in data or 'password' not in data:
            return jsonify({
                'success': False,
                'message': 'Email and password are required',
                'correlation_id': request.correlation_id
            }), 400
        
        email = data['email'].strip().lower()
        password = data['password']
        
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Get user by email
        cursor.execute("""
            SELECT id, email, password, name, role, created_at 
            FROM users 
            WHERE email = %s
        """, (email,))
        
        user = cursor.fetchone()
        cursor.close()
        conn.close()
        
        if not user:
            logger.warning(f"Login failed: User {email} not found")
            return jsonify({
                'success': False,
                'message': 'Invalid email or password',
                'correlation_id': request.correlation_id
            }), 401
        
        # Verify password
        if not bcrypt.checkpw(
            password.encode('utf-8'), 
            user['password'].encode('utf-8')
        ):
            logger.warning(f"Login failed: Invalid password for user {email}")
            return jsonify({
                'success': False,
                'message': 'Invalid email or password',
                'correlation_id': request.correlation_id
            }), 401
        
        # Update last login (optional - add last_login column to users table)
        # conn = get_db_connection()
        # cursor = conn.cursor()
        # cursor.execute("UPDATE users SET last_login = %s WHERE id = %s", (datetime.now(), user['id']))
        # conn.commit()
        # cursor.close()
        # conn.close()
        
        # Generate JWT token
        token_payload = {
            'user_id': user['id'],
            'email': user['email'],
            'name': user['name'],
            'role': user['role'],
            'exp': datetime.utcnow() + timedelta(hours=24)
        }
        token = jwt.encode(token_payload, app.config['SECRET_KEY'])
        
        logger.info(f"User logged in successfully: {email} (ID: {user['id']})")
        
        return jsonify({
            'success': True,
            'message': 'Login successful',
            'data': {
                'token': token,
                'user': {
                    'id': user['id'],
                    'email': user['email'],
                    'name': user['name'],
                    'role': user['role'],
                    'created_at': user['created_at'].isoformat() if user['created_at'] else None
                }
            },
            'correlation_id': request.correlation_id
        }), 200
        
    except DatabaseError as e:
        logger.error(f"Database error during login: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Database error',
            'error': str(e),
            'correlation_id': request.correlation_id
        }), 500
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Login failed',
            'error': str(e),
            'correlation_id': request.correlation_id
        }), 500

@app.route('/logout', methods=['POST'])
@token_required
def logout():
    """
    Logout user (invalidate token on client side)
    Note: For true token invalidation, implement token blacklist
    """
    # In a stateless JWT system, logout is handled client-side
    # For token invalidation, you'd need a token blacklist
    logger.info(f"User {request.current_user.get('email')} logged out")
    
    return jsonify({
        'success': True,
        'message': 'Logged out successfully',
        'correlation_id': request.correlation_id
    }), 200

@app.route('/validate-token', methods=['POST'])
def validate_token():
    """
    Validate a JWT token
    Request body: {token}
    """
    try:
        data = request.get_json()
        
        if not data or 'token' not in data:
            return jsonify({
                'success': False,
                'message': 'Token is required',
                'correlation_id': request.correlation_id
            }), 400
        
        token = data['token']
        
        try:
            # Decode and validate token
            decoded = jwt.decode(
                token, 
                app.config['SECRET_KEY'], 
                algorithms=["HS256"]
            )
            
            # Check if user still exists
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT id FROM users WHERE id = %s", (decoded['user_id'],))
            user_exists = cursor.fetchone() is not None
            cursor.close()
            conn.close()
            
            if not user_exists:
                return jsonify({
                    'success': False,
                    'valid': False,
                    'message': 'User no longer exists',
                    'correlation_id': request.correlation_id
                }), 200
            
            return jsonify({
                'success': True,
                'valid': True,
                'user': decoded,
                'correlation_id': request.correlation_id
            }), 200
            
        except jwt.ExpiredSignatureError:
            return jsonify({
                'success': True,
                'valid': False,
                'message': 'Token expired',
                'correlation_id': request.correlation_id
            }), 200
        except jwt.InvalidTokenError:
            return jsonify({
                'success': True,
                'valid': False,
                'message': 'Invalid token',
                'correlation_id': request.correlation_id
            }), 200
            
    except Exception as e:
        logger.error(f"Token validation error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Token validation failed',
            'error': str(e),
            'correlation_id': request.correlation_id
        }), 500

# ============================
# USER MANAGEMENT ENDPOINTS
# ============================

@app.route('/users/me', methods=['GET'])
@token_required
def get_current_user():
    """
    Get current user's profile
    """
    try:
        user_id = request.current_user['user_id']
        
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute("""
            SELECT id, email, name, role, created_at, updated_at
            FROM users 
            WHERE id = %s
        """, (user_id,))
        
        user = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        if not user:
            logger.warning(f"User not found: ID {user_id}")
            return jsonify({
                'success': False,
                'message': 'User not found',
                'correlation_id': request.correlation_id
            }), 404
        
        # Convert datetime to ISO format
        user['created_at'] = user['created_at'].isoformat() if user['created_at'] else None
        user['updated_at'] = user['updated_at'].isoformat() if user['updated_at'] else None
        
        logger.info(f"Retrieved profile for user: {user['email']}")
        
        return jsonify({
            'success': True,
            'data': user,
            'correlation_id': request.correlation_id
        }), 200
        
    except Exception as e:
        logger.error(f"Get current user error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to retrieve user profile',
            'error': str(e),
            'correlation_id': request.correlation_id
        }), 500

@app.route('/users/<int:user_id>', methods=['GET'])
@token_required
def get_user(user_id):
    """
    Get user by ID
    - Users can view their own profile
    - Staff/Admins can view any profile
    """
    try:
        current_user = request.current_user
        
        # Check permissions
        if current_user['user_id'] != user_id and current_user['role'] not in ['staff', 'admin']:
            logger.warning(f"Unauthorized access attempt: User {current_user['email']} tried to access user {user_id}")
            return jsonify({
                'success': False,
                'message': 'Unauthorized access',
                'correlation_id': request.correlation_id
            }), 403
        
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute("""
            SELECT id, email, name, role, created_at, updated_at
            FROM users 
            WHERE id = %s
        """, (user_id,))
        
        user = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        if not user:
            return jsonify({
                'success': False,
                'message': 'User not found',
                'correlation_id': request.correlation_id
            }), 404
        
        # Convert datetime to ISO format
        user['created_at'] = user['created_at'].isoformat() if user['created_at'] else None
        user['updated_at'] = user['updated_at'].isoformat() if user['updated_at'] else None
        
        logger.info(f"Retrieved user: {user['email']} (Requested by: {current_user['email']})")
        
        return jsonify({
            'success': True,
            'data': user,
            'correlation_id': request.correlation_id
        }), 200
        
    except Exception as e:
        logger.error(f"Get user error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to retrieve user',
            'error': str(e),
            'correlation_id': request.correlation_id
        }), 500

@app.route('/users/me', methods=['PUT'])
@token_required
def update_current_user():
    """
    Update current user's profile
    Request body: {name}
    """
    try:
        user_id = request.current_user['user_id']
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'message': 'Request body is required',
                'correlation_id': request.correlation_id
            }), 400
        
        # Extract updatable fields
        name = data.get('name')
        
        # Validate at least one field to update
        if not name:
            return jsonify({
                'success': False,
                'message': 'At least one field (name) is required for update',
                'correlation_id': request.correlation_id
            }), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Update user
        cursor.execute("""
            UPDATE users 
            SET name = %s, updated_at = %s
            WHERE id = %s
        """, (name, datetime.now(), user_id))
        
        if cursor.rowcount == 0:
            cursor.close()
            conn.close()
            return jsonify({
                'success': False,
                'message': 'User not found',
                'correlation_id': request.correlation_id
            }), 404
        
        conn.commit()
        cursor.close()
        conn.close()
        
        logger.info(f"User updated: ID {user_id} - Name changed to {name}")
        
        return jsonify({
            'success': True,
            'message': 'User profile updated successfully',
            'correlation_id': request.correlation_id
        }), 200
        
    except Exception as e:
        logger.error(f"Update user error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to update user profile',
            'error': str(e),
            'correlation_id': request.correlation_id
        }), 500

@app.route('/users/me/password', methods=['PUT'])
@token_required
def change_password():
    """
    Change current user's password
    Request body: {current_password, new_password}
    """
    try:
        user_id = request.current_user['user_id']
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'message': 'Request body is required',
                'correlation_id': request.correlation_id
            }), 400
        
        current_password = data.get('current_password')
        new_password = data.get('new_password')
        
        if not current_password or not new_password:
            return jsonify({
                'success': False,
                'message': 'Both current_password and new_password are required',
                'correlation_id': request.correlation_id
            }), 400
        
        # Validate new password strength
        is_valid, message = validate_password(new_password)
        if not is_valid:
            return jsonify({
                'success': False,
                'message': message,
                'correlation_id': request.correlation_id
            }), 400
        
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Get current password hash
        cursor.execute("SELECT password FROM users WHERE id = %s", (user_id,))
        user = cursor.fetchone()
        
        if not user:
            cursor.close()
            conn.close()
            return jsonify({
                'success': False,
                'message': 'User not found',
                'correlation_id': request.correlation_id
            }), 404
        
        # Verify current password
        if not bcrypt.checkpw(
            current_password.encode('utf-8'),
            user['password'].encode('utf-8')
        ):
            cursor.close()
            conn.close()
            logger.warning(f"Password change failed for user {user_id}: Current password incorrect")
            return jsonify({
                'success': False,
                'message': 'Current password is incorrect',
                'correlation_id': request.correlation_id
            }), 401
        
        # Hash new password
        new_hashed_password = bcrypt.hashpw(
            new_password.encode('utf-8'),
            bcrypt.gensalt()
        ).decode('utf-8')
        
        # Update password
        cursor.execute("""
            UPDATE users 
            SET password = %s, updated_at = %s
            WHERE id = %s
        """, (new_hashed_password, datetime.now(), user_id))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        logger.info(f"Password changed for user ID: {user_id}")
        
        return jsonify({
            'success': True,
            'message': 'Password changed successfully',
            'correlation_id': request.correlation_id
        }), 200
        
    except Exception as e:
        logger.error(f"Change password error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to change password',
            'error': str(e),
            'correlation_id': request.correlation_id
        }), 500

# ============================
# ADMIN ENDPOINTS
# ============================

@app.route('/users', methods=['GET'])
@token_required
@role_required('admin', 'staff')
def get_all_users():
    """
    Get all users (admin/staff only)
    Query parameters: page, limit, role, search
    """
    try:
        # Get query parameters
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 20))
        role_filter = request.args.get('role')
        search = request.args.get('search', '')
        
        # Validate pagination
        if page < 1:
            page = 1
        if limit < 1 or limit > 100:
            limit = 20
        
        offset = (page - 1) * limit
        
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Build query
        query = """
            SELECT id, email, name, role, created_at, updated_at
            FROM users 
            WHERE 1=1
        """
        params = []
        
        if role_filter:
            query += " AND role = %s"
            params.append(role_filter)
        
        if search:
            query += " AND (email LIKE %s OR name LIKE %s)"
            params.extend([f"%{search}%", f"%{search}%"])
        
        # Get total count
        count_query = f"SELECT COUNT(*) as total FROM ({query}) as subquery"
        cursor.execute(count_query, params)
        total = cursor.fetchone()['total']
        
        # Get paginated results
        query += " ORDER BY created_at DESC LIMIT %s OFFSET %s"
        params.extend([limit, offset])
        
        cursor.execute(query, params)
        users = cursor.fetchall()
        
        # Convert datetime to ISO format
        for user in users:
            user['created_at'] = user['created_at'].isoformat() if user['created_at'] else None
            user['updated_at'] = user['updated_at'].isoformat() if user['updated_at'] else None
        
        cursor.close()
        conn.close()
        
        # Calculate pagination info
        total_pages = (total + limit - 1) // limit  # Ceiling division
        
        logger.info(f"Retrieved {len(users)} users (Page {page} of {total_pages})")
        
        return jsonify({
            'success': True,
            'data': {
                'users': users,
                'pagination': {
                    'page': page,
                    'limit': limit,
                    'total': total,
                    'total_pages': total_pages,
                    'has_next': page < total_pages,
                    'has_prev': page > 1
                }
            },
            'correlation_id': request.correlation_id
        }), 200
        
    except Exception as e:
        logger.error(f"Get all users error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to retrieve users',
            'error': str(e),
            'correlation_id': request.correlation_id
        }), 500

@app.route('/users/<int:user_id>/role', methods=['PUT'])
@token_required
@role_required('admin')
def update_user_role(user_id):
    """
    Update user role (admin only)
    Request body: {role}
    """
    try:
        data = request.get_json()
        
        if not data or 'role' not in data:
            return jsonify({
                'success': False,
                'message': 'Role is required',
                'correlation_id': request.correlation_id
            }), 400
        
        new_role = data['role'].lower()
        valid_roles = ['student', 'staff', 'admin']
        
        if new_role not in valid_roles:
            return jsonify({
                'success': False,
                'message': f'Role must be one of: {", ".join(valid_roles)}',
                'correlation_id': request.correlation_id
            }), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Update role
        cursor.execute("""
            UPDATE users 
            SET role = %s, updated_at = %s
            WHERE id = %s
        """, (new_role, datetime.now(), user_id))
        
        if cursor.rowcount == 0:
            cursor.close()
            conn.close()
            return jsonify({
                'success': False,
                'message': 'User not found',
                'correlation_id': request.correlation_id
            }), 404
        
        conn.commit()
        cursor.close()
        conn.close()
        
        logger.info(f"User role updated: ID {user_id} -> {new_role} (By admin: {request.current_user.get('email')})")
        
        return jsonify({
            'success': True,
            'message': f'User role updated to {new_role}',
            'correlation_id': request.correlation_id
        }), 200
        
    except Exception as e:
        logger.error(f"Update user role error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to update user role',
            'error': str(e),
            'correlation_id': request.correlation_id
        }), 500

@app.route('/users/<int:user_id>', methods=['DELETE'])
@token_required
@role_required('admin')
def delete_user(user_id):
    """
    Delete a user (admin only - soft delete)
    """
    try:
        # Prevent admin from deleting themselves
        if user_id == request.current_user['user_id']:
            return jsonify({
                'success': False,
                'message': 'Cannot delete your own account',
                'correlation_id': request.correlation_id
            }), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Soft delete - set is_active to false (add this column to users table)
        # For now, we'll do a hard delete since we don't have is_active column
        cursor.execute("DELETE FROM users WHERE id = %s", (user_id,))
        
        if cursor.rowcount == 0:
            cursor.close()
            conn.close()
            return jsonify({
                'success': False,
                'message': 'User not found',
                'correlation_id': request.correlation_id
            }), 404
        
        conn.commit()
        cursor.close()
        conn.close()
        
        logger.warning(f"User deleted: ID {user_id} (By admin: {request.current_user.get('email')})")
        
        return jsonify({
            'success': True,
            'message': 'User deleted successfully',
            'correlation_id': request.correlation_id
        }), 200
        
    except Exception as e:
        logger.error(f"Delete user error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to delete user',
            'error': str(e),
            'correlation_id': request.correlation_id
        }), 500

# ============================
# DATABASE INITIALIZATION
# ============================

def wait_for_mysql():
    """Wait for MySQL to be ready"""
    max_retries = 30
    retry_delay = 2
    
    logger.info(f"Waiting for MySQL at {app.config['MYSQL_HOST']}...")
    
    for attempt in range(max_retries):
        try:
            conn = get_root_connection()
            conn.close()
            logger.info("MySQL is ready!")
            return True
        except Exception as e:
            logger.info(f"MySQL not ready (attempt {attempt + 1}/{max_retries}): {str(e)}")
            if attempt < max_retries - 1:
                time.sleep(retry_delay)
    
    logger.error(f"MySQL not ready after {max_retries} attempts")
    return False

def init_database():
    """Initialize database and tables"""
    try:
        logger.info("Starting database initialization...")
        
        # Create database if not exists
        root_conn = get_root_connection()
        root_cursor = root_conn.cursor()
        root_cursor.execute(f"CREATE DATABASE IF NOT EXISTS {app.config['MYSQL_DB']}")
        root_cursor.close()
        root_conn.close()
        logger.info(f"Database {app.config['MYSQL_DB']} ensured")
        
        # Connect to specific database
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Create users table with extended schema
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                name VARCHAR(255) NOT NULL,
                role ENUM('student', 'staff', 'admin') DEFAULT 'student',
                is_active BOOLEAN DEFAULT TRUE,
                last_login TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_email (email),
                INDEX idx_role (role),
                INDEX idx_created_at (created_at)
            )
        """)
        logger.info("Users table ensured")
        
        # Check if we need to insert test data
        cursor.execute("SELECT COUNT(*) FROM users")
        user_count = cursor.fetchone()[0]
        
        if user_count == 0:
            logger.info("Inserting test users...")
            test_users = [
                ('admin@campus.edu', 'admin123', 'Admin User', 'admin'),
                ('student@campus.edu', 'student123', 'John Student', 'student'),
                ('staff@campus.edu', 'staff123', 'Jane Staff', 'staff'),
                ('alice@campus.edu', 'alice123', 'Alice Johnson', 'student'),
                ('bob@campus.edu', 'bob123', 'Bob Smith', 'student')
            ]
            
            for email, password, name, role in test_users:
                hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
                cursor.execute(
                    "INSERT INTO users (email, password, name, role) VALUES (%s, %s, %s, %s)",
                    (email, hashed, name, role)
                )
            logger.info(f"Inserted {len(test_users)} test users")
        
        conn.commit()
        cursor.close()
        conn.close()
        
        logger.info("Database initialization completed successfully")
        return True
        
    except Exception as e:
        logger.error(f"Database initialization failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

# ============================
# ERROR HANDLERS
# ============================

@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors"""
    return jsonify({
        'success': False,
        'message': 'Endpoint not found',
        'correlation_id': request.correlation_id
    }), 404

@app.errorhandler(405)
def method_not_allowed(error):
    """Handle 405 errors"""
    return jsonify({
        'success': False,
        'message': 'Method not allowed',
        'correlation_id': request.correlation_id
    }), 405

@app.errorhandler(500)
def internal_error(error):
    """Handle 500 errors"""
    logger.error(f"Internal server error: {str(error)}")
    return jsonify({
        'success': False,
        'message': 'Internal server error',
        'correlation_id': request.correlation_id
    }), 500

# ============================
# APPLICATION STARTUP
# ============================

if __name__ == '__main__':
    try:
        # Wait for MySQL to be ready
        if wait_for_mysql():
            # Initialize database
            if init_database():
                logger.info("=" * 50)
                logger.info("User Service Starting")
                logger.info(f"Host: {app.config['MYSQL_HOST']}")
                logger.info(f"Database: {app.config['MYSQL_DB']}")
                logger.info(f"Port: 5000")
                logger.info("=" * 50)
                
                # Start Flask app
                app.run(
                    host='0.0.0.0',
                    port=5000,
                    debug=False,  # Set to False in production
                    threaded=True
                )
            else:
                logger.error("Database initialization failed. Exiting.")
        else:
            logger.error("MySQL is not available. Exiting.")
            
    except KeyboardInterrupt:
        logger.info("Service stopped by user")
    except Exception as e:
        logger.error(f"Failed to start service: {str(e)}")
        import traceback
        traceback.print_exc()
