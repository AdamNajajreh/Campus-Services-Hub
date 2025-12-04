from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import os
import logging
from functools import wraps
import jwt

app = Flask(__name__)
CORS(app)

# Service URLs
SERVICES = {
    'user': os.getenv('USER_SERVICE_URL', 'http://localhost:5001'),
    'request': os.getenv('REQUEST_SERVICE_URL', 'http://localhost:5002'),
    'booking': os.getenv('BOOKING_SERVICE_URL', 'http://localhost:5003'),
    'notification': os.getenv('NOTIFICATION_SERVICE_URL', 'http://localhost:5004')
}

# Secret key for JWT verification
SECRET_KEY = os.getenv('SECRET_KEY', 'campus-services-secret-key')

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            token = request.headers['Authorization'].split(" ")[1]
        
        if not token:
            return jsonify({'message': 'Token is missing!'}), 401
        
        try:
            data = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            request.current_user = data
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token has expired!'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Invalid token!'}), 401
        
        return f(*args, **kwargs)
    return decorated

def forward_request(service_name, path, method='GET', data=None, headers=None):
    """Forward request to appropriate service"""
    try:
        service_url = SERVICES[service_name]
        url = f"{service_url}{path}"
        
        # Prepare headers
        forward_headers = {}
        if headers:
            forward_headers.update(headers)
        
        # Remove host header to avoid issues
        if 'Host' in forward_headers:
            del forward_headers['Host']
        
        # Forward the request
        if method == 'GET':
            response = requests.get(url, headers=forward_headers, params=request.args)
        elif method == 'POST':
            response = requests.post(url, headers=forward_headers, json=data or request.get_json())
        elif method == 'PUT':
            response = requests.put(url, headers=forward_headers, json=data or request.get_json())
        elif method == 'DELETE':
            response = requests.delete(url, headers=forward_headers)
        else:
            return jsonify({'message': 'Method not allowed'}), 405
        
        # Return the response from the service
        return response.content, response.status_code, response.headers.items()
        
    except requests.exceptions.ConnectionError:
        logger.error(f"Cannot connect to {service_name} service")
        return jsonify({'message': f'{service_name} service unavailable'}), 503
    except Exception as e:
        logger.error(f"Error forwarding to {service_name}: {str(e)}")
        return jsonify({'message': 'Internal server error'}), 500

@app.route('/health', methods=['GET'])
def health_check():
    # Check health of all services
    health_status = {}
    for service_name, url in SERVICES.items():
        try:
            response = requests.get(f"{url}/health", timeout=2)
            health_status[service_name] = response.status_code == 200
        except:
            health_status[service_name] = False
    
    all_healthy = all(health_status.values())
    return jsonify({
        'status': 'healthy' if all_healthy else 'degraded',
        'services': health_status
    }), 200 if all_healthy else 503

# Auth routes
@app.route('/api/auth/register', methods=['POST'])
def register():
    return forward_request('user', '/register', 'POST')

@app.route('/api/auth/login', methods=['POST'])
def login():
    return forward_request('user', '/login', 'POST')

# User routes
@app.route('/api/users/<int:user_id>', methods=['GET'])
@token_required
def get_user(user_id):
    return forward_request('user', f'/users/{user_id}', 'GET')

@app.route('/api/users/<int:user_id>', methods=['PUT'])
@token_required
def update_user(user_id):
    return forward_request('user', f'/users/{user_id}', 'PUT')

# Request routes
@app.route('/api/requests', methods=['GET'])
@token_required
def get_requests():
    return forward_request('request', '/requests', 'GET')

@app.route('/api/requests', methods=['POST'])
@token_required
def create_request():
    return forward_request('request', '/requests', 'POST')

@app.route('/api/requests/<int:request_id>', methods=['GET'])
@token_required
def get_request(request_id):
    return forward_request('request', f'/requests/{request_id}', 'GET')

@app.route('/api/requests/<int:request_id>/status', methods=['PUT'])
@token_required
def update_request_status(request_id):
    return forward_request('request', f'/requests/{request_id}/status', 'PUT')

# Booking routes
@app.route('/api/rooms', methods=['GET'])
def get_rooms():
    return forward_request('booking', '/rooms', 'GET')

@app.route('/api/rooms/<int:room_id>/availability', methods=['GET'])
def check_availability(room_id):
    return forward_request('booking', f'/rooms/{room_id}/availability', 'GET')

@app.route('/api/bookings', methods=['GET'])
@token_required
def get_bookings():
    return forward_request('booking', '/bookings', 'GET')

@app.route('/api/bookings', methods=['POST'])
@token_required
def create_booking():
    return forward_request('booking', '/bookings', 'POST')

@app.route('/api/bookings/<int:booking_id>', methods=['DELETE'])
@token_required
def cancel_booking(booking_id):
    return forward_request('booking', f'/bookings/{booking_id}', 'DELETE')

# Notification routes
@app.route('/api/notifications/user/<int:user_id>', methods=['GET'])
@token_required
def get_user_notifications(user_id):
    return forward_request('notification', f'/notifications/user/{user_id}', 'GET')

@app.route('/api/notifications/<int:notification_id>/read', methods=['PUT'])
@token_required
def mark_as_read(notification_id):
    return forward_request('notification', f'/notifications/{notification_id}/read', 'PUT')

@app.route('/api/notifications/unread/count/<int:user_id>', methods=['GET'])
@token_required
def get_unread_count(user_id):
    return forward_request('notification', f'/notifications/unread/count/{user_id}', 'GET')

@app.route('/api/announcements', methods=['GET'])
def get_announcements():
    return forward_request('notification', '/announcements', 'GET')

@app.route('/api/announcements', methods=['POST'])
@token_required
def create_announcement():
    return forward_request('notification', '/announcements', 'POST')

# Aggregate endpoints for dashboard
@app.route('/api/dashboard/<int:user_id>', methods=['GET'])
@token_required
def get_dashboard(user_id):
    """Aggregate data for user dashboard"""
    try:
        # Get user info
        user_response = requests.get(f"{SERVICES['user']}/users/{user_id}", 
                                   headers=request.headers)
        user_data = user_response.json() if user_response.status_code == 200 else {}
        
        # Get user's requests
        requests_response = requests.get(f"{SERVICES['request']}/requests?user_id={user_id}",
                                       headers=request.headers)
        requests_data = requests_response.json() if requests_response.status_code == 200 else []
        
        # Get user's bookings
        bookings_response = requests.get(f"{SERVICES['booking']}/bookings",
                                       headers=request.headers)
        bookings_data = bookings_response.json() if bookings_response.status_code == 200 else []
        
        # Get user's notifications
        notifications_response = requests.get(f"{SERVICES['notification']}/notifications/user/{user_id}",
                                           headers=request.headers)
        notifications_data = notifications_response.json() if notifications_response.status_code == 200 else []
        
        # Get announcements
        announcements_response = requests.get(f"{SERVICES['notification']}/announcements?audience=all")
        announcements_data = announcements_response.json() if announcements_response.status_code == 200 else []
        
        return jsonify({
            'user': user_data,
            'requests': requests_data[:5],  # Last 5 requests
            'bookings': bookings_data[:5],  # Last 5 bookings
            'notifications': notifications_data[:10],  # Last 10 notifications
            'announcements': announcements_data[:5]  # Last 5 announcements
        }), 200
        
    except Exception as e:
        logger.error(f"Dashboard error: {str(e)}")
        return jsonify({'message': 'Failed to load dashboard'}), 500

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({'message': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'message': 'Internal server error'}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5005, debug=True)
