from flask import Flask, request, jsonify
from flask_cors import CORS
import mysql.connector
import jwt
import bcrypt
import os
from datetime import datetime, timedelta
import logging
from functools import wraps

app = Flask(__name__)
CORS(app)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'campus-services-secret-key')

# Database configuration
db_config = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'user': os.getenv('DB_USER', 'root'),
    'password': os.getenv('DB_PASSWORD', 'rootpassword'),
    'database': os.getenv('DB_NAME', 'user_db')
}

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_db_connection():
    return mysql.connector.connect(**db_config)

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            token = request.headers['Authorization'].split(" ")[1]
        
        if not token:
            return jsonify({'message': 'Token is missing!'}), 401
        
        try:
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
            current_user = data['user_id']
        except:
            return jsonify({'message': 'Token is invalid!'}), 401
        
        return f(current_user, *args, **kwargs)
    return decorated

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'service': 'user-service'}), 200

@app.route('/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')
        name = data.get('name')
        role = data.get('role', 'student')  # student or staff
        
        # Hash password
        hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
        
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Check if user exists
        cursor.execute("SELECT id FROM users WHERE email = %s", (email,))
        if cursor.fetchone():
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
        
    except Exception as e:
        logger.error(f"Registration error: {str(e)}")
        return jsonify({'message': 'Registration failed', 'error': str(e)}), 500

@app.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')
        
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
        user = cursor.fetchone()
        
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
            
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        return jsonify({'message': 'Login failed', 'error': str(e)}), 500

@app.route('/users/<int:user_id>', methods=['GET'])
@token_required
def get_user(current_user, user_id):
    if current_user != user_id:
        return jsonify({'message': 'Unauthorized access'}), 403
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
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

@app.route('/users', methods=['GET'])
@token_required
def get_all_users(current_user):
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute("SELECT id, email, name, role, created_at FROM users")
        users = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        return jsonify(users), 200
        
    except Exception as e:
        logger.error(f"Get all users error: {str(e)}")
        return jsonify({'message': 'Failed to get users', 'error': str(e)}), 500

if __name__ == '__main__':
    # Initialize database
    conn = mysql.connector.connect(
        host=db_config['host'],
        user=db_config['user'],
        password=db_config['password']
    )
    cursor = conn.cursor()
    
    # Create database if not exists
    cursor.execute(f"CREATE DATABASE IF NOT EXISTS {db_config['database']}")
    cursor.close()
    conn.close()
    
    # Create tables
    conn = get_db_connection()
    cursor = conn.cursor()
    
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
    
    # Insert test data
    cursor.execute("SELECT COUNT(*) FROM users")
    if cursor.fetchone()[0] == 0:
        hashed_admin = bcrypt.hashpw('admin123'.encode('utf-8'), bcrypt.gensalt())
        hashed_student = bcrypt.hashpw('student123'.encode('utf-8'), bcrypt.gensalt())
        hashed_staff = bcrypt.hashpw('staff123'.encode('utf-8'), bcrypt.gensalt())
        
        cursor.execute("""
            INSERT INTO users (email, password, name, role) VALUES
            ('admin@campus.edu', %s, 'Admin User', 'admin'),
            ('student@campus.edu', %s, 'John Student', 'student'),
            ('staff@campus.edu', %s, 'Jane Staff', 'staff')
        """, (hashed_admin.decode('utf-8'), hashed_student.decode('utf-8'), hashed_staff.decode('utf-8')))
    
    conn.commit()
    cursor.close()
    conn.close()
    
    app.run(host='0.0.0.0', port=5000, debug=True)
