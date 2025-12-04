from flask import Flask, request, jsonify
from flask_cors import CORS
import mysql.connector
import jwt
import bcrypt
import os
from datetime import datetime, timedelta
import logging
from functools import wraps
from config import Config

app = Flask(__name__)
CORS(app)
app.config.from_object(Config)

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Database configuration using Config class
def get_db_connection():
    """Create and return a database connection"""
    return mysql.connector.connect(
        host=app.config['MYSQL_HOST'],
        user=app.config['MYSQL_USER'],
        password=app.config['MYSQL_PASSWORD'],
        database=app.config['MYSQL_DB']
    )

def get_root_connection():
    """Get connection without database for initialization"""
    return mysql.connector.connect(
        host=app.config['MYSQL_HOST'],
        user=app.config['MYSQL_USER'],
        password=app.config['MYSQL_PASSWORD']
    )

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            if auth_header.startswith('Bearer '):
                token = auth_header.split(" ")[1]
        
        if not token:
            return jsonify({'message': 'Token is missing!'}), 401
        
        try:
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
            current_user = data['user_id']
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token has expired!'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Token is invalid!'}), 401
        except Exception as e:
            logger.error(f"Token validation error: {str(e)}")
            return jsonify({'message': 'Token validation failed!'}), 401
        
        return f(current_user, *args, **kwargs)
    return decorated

@app.route('/health', methods=['GET'])
def health_check():
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
            'timestamp': datetime.now().isoformat()
        }), 200
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return jsonify({
            'status': 'unhealthy', 
            'service': 'user-service',
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500

@app.route('/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data or 'email' not in data or 'password' not in data or 'name' not in data:
            return jsonify({'message': 'Missing required fields: email, password, name'}), 400
        
        email = data.get('email')
        password = data.get('password')
        name = data.get('name')
        role = data.get('role', 'student')  # student or staff
        
        # Validate role
        if role not in ['student', 'staff', 'admin']:
            return jsonify({'message': 'Invalid role. Must be student, staff, or admin'}), 400
        
        # Validate email format
        if '@' not in email or '.' not in email:
            return jsonify({'message': 'Invalid email format'}), 400
        
        # Hash password
        hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
        
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Check if user exists
        cursor.execute("SELECT id FROM users WHERE email = %s", (email,))
        if cursor.fetchone():
            cursor.close()
            conn.close()
            return jsonify({'message': 'User already exists'}), 400
        
        # Insert new user
        cursor.execute("""
            INSERT INTO users (email, password, name, role, created_at)
            VALUES (%s, %s, %s, %s, %s)
        """, (email, hashed_password.decode('utf-8'), name, role, datetime.now()))
        
        user_id = cursor.lastrowid
        conn.commit()
        
        # Generate token
        token = jwt.encode({
            'user_id': user_id,
            'email': email,
            'role': role,
            'exp': datetime.utcnow() + timedelta(hours=24)
        }, app.config['SECRET_KEY'])
        
        cursor.close()
        conn.close()
        
        logger.info(f"User registered: {email}")
        return jsonify({
            'message': 'User registered successfully',
            'token': token,
            'user': {
                'id': user_id,
                'email': email,
                'name': name,
                'role': role
            }
        }), 201
        
    except mysql.connector.Error as e:
        logger.error(f"Database error during registration: {str(e)}")
        return jsonify({'message': 'Database error', 'error': str(e)}), 500
    except Exception as e:
        logger.error(f"Registration error: {str(e)}")
        return jsonify({'message': 'Registration failed', 'error': str(e)}), 500

@app.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        
        if not data or 'email' not in data or 'password' not in data:
            return jsonify({'message': 'Email and password are required'}), 400
        
        email = data.get('email')
        password = data.get('password')
        
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
        user = cursor.fetchone()
        cursor.close()
        conn.close()
        
        if not user:
            return jsonify({'message': 'Invalid credentials'}), 401
        
        # Verify password
        if bcrypt.checkpw(password.encode('utf-8'), user['password'].encode('utf-8')):
            # Generate token
            token = jwt.encode({
                'user_id': user['id'],
                'email': user['email'],
                'role': user['role'],
                'exp': datetime.utcnow() + timedelta(hours=24)
            }, app.config['SECRET_KEY'])
            
            logger.info(f"User logged in: {email}")
            return jsonify({
                'message': 'Login successful',
                'token': token,
                'user': {
                    'id': user['id'],
                    'email': user['email'],
                    'name': user['name'],
                    'role': user['role']
                }
            }), 200
        else:
            return jsonify({'message': 'Invalid credentials'}), 401
            
    except mysql.connector.Error as e:
        logger.error(f"Database error during login: {str(e)}")
        return jsonify({'message': 'Database error', 'error': str(e)}), 500
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        return jsonify({'message': 'Login failed', 'error': str(e)}), 500

@app.route('/users/<int:user_id>', methods=['GET'])
@token_required
def get_user(current_user, user_id):
    # Only allow users to view their own profile unless admin
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Check if user is admin
        cursor.execute("SELECT role FROM users WHERE id = %s", (current_user,))
        current_user_role = cursor.fetchone()
        
        # Allow access if: same user OR current user is admin/staff
        if current_user != user_id and (not current_user_role or current_user_role['role'] not in ['admin', 'staff']):
            cursor.close()
            conn.close()
            return jsonify({'message': 'Unauthorized access'}), 403
        
        cursor.execute("SELECT id, email, name, role, created_at FROM users WHERE id = %s", (user_id,))
        user = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        if user:
            return jsonify(user), 200
        else:
            return jsonify({'message': 'User not found'}), 404
            
    except Exception as e:
        logger.error(f"Get user error: {str(e)}")
        return jsonify({'message': 'Failed to get user', 'error': str(e)}), 500

@app.route('/users/<int:user_id>', methods=['PUT'])
@token_required
def update_user(current_user, user_id):
    if current_user != user_id:
        return jsonify({'message': 'Unauthorized access'}), 403
    
    try:
        data = request.get_json()
        if not data or 'name' not in data:
            return jsonify({'message': 'Name is required'}), 400
        
        name = data.get('name')
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            UPDATE users SET name = %s, updated_at = %s WHERE id = %s
        """, (name, datetime.now(), user_id))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        logger.info(f"User updated: {user_id}")
        return jsonify({'message': 'User updated successfully'}), 200
        
    except Exception as e:
        logger.error(f"Update user error: {str(e)}")
        return jsonify({'message': 'Failed to update user', 'error': str(e)}), 500

@app.route('/users/me', methods=['GET'])
@token_required
def get_current_user(current_user):
    """Get current user's profile"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute("SELECT id, email, name, role, created_at FROM users WHERE id = %s", (current_user,))
        user = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        if user:
            return jsonify(user), 200
        else:
            return jsonify({'message': 'User not found'}), 404
            
    except Exception as e:
        logger.error(f"Get current user error: {str(e)}")
        return jsonify({'message': 'Failed to get user', 'error': str(e)}), 500

@app.route('/users', methods=['GET'])
@token_required
def get_all_users(current_user):
    try:
        # Check if user is admin/staff
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute("SELECT role FROM users WHERE id = %s", (current_user,))
        current_user_role = cursor.fetchone()
        
        if not current_user_role or current_user_role['role'] not in ['admin', 'staff']:
            cursor.close()
            conn.close()
            return jsonify({'message': 'Unauthorized access'}), 403
        
        cursor.execute("SELECT id, email, name, role, created_at FROM users")
        users = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        return jsonify(users), 200
        
    except Exception as e:
        logger.error(f"Get all users error: {str(e)}")
        return jsonify({'message': 'Failed to get users', 'error': str(e)}), 500

def init_database():
    """Initialize database and tables"""
    try:
        # First, connect without database to create it
        conn = get_root_connection()
        cursor = conn.cursor()
        
        # Create database if not exists
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS {app.config['MYSQL_DB']}")
        cursor.close()
        conn.close()
        
        # Now connect to the specific database
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Create users table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                name VARCHAR(255) NOT NULL,
                role ENUM('student', 'staff', 'admin') DEFAULT 'student',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP
            )
        """)
        
        # Check if we need to insert test data
        cursor.execute("SELECT COUNT(*) FROM users")
        user_count = cursor.fetchone()[0]
        
        if user_count == 0:
            hashed_admin = bcrypt.hashpw('admin123'.encode('utf-8'), bcrypt.gensalt())
            hashed_student = bcrypt.hashpw('student123'.encode('utf-8'), bcrypt.gensalt())
            hashed_staff = bcrypt.hashpw('staff123'.encode('utf-8'), bcrypt.gensalt())
            
            cursor.execute("""
                INSERT INTO users (email, password, name, role) VALUES
                ('admin@campus.edu', %s, 'Admin User', 'admin'),
                ('student@campus.edu', %s, 'John Student', 'student'),
                ('staff@campus.edu', %s, 'Jane Staff', 'staff')
            """, (hashed_admin.decode('utf-8'), hashed_student.decode('utf-8'), hashed_staff.decode('utf-8')))
            
            logger.info("Inserted test users")
        
        conn.commit()
        cursor.close()
        conn.close()
        
        logger.info("Database initialization completed successfully")
        
    except Exception as e:
        logger.error(f"Database initialization failed: {str(e)}")
        raise

if __name__ == '__main__':
    # Initialize database
    try:
        init_database()
        logger.info(f"User service starting on port 5000")
        app.run(host='0.0.0.0', port=5000, debug=True)
    except Exception as e:
        logger.error(f"Failed to start user service: {str(e)}")
