# Campus Services Hub - Detailed Analysis

## Multi-Branch Architecture Overview

This project uses a multi-branch Git architecture where each microservice is developed in its own branch:
- `user-service` - User management and authentication
- `request-service` - Service request/ticket management
- `booking-service` - Room/lab booking management
- `notification-service` - Notifications and announcements
- `api-gateway` - API Gateway routing requests to microservices

---

## 1. USER SERVICE (`user-service` branch)

### Overview
- **File**: `app.py` (1,029 lines)
- **Port**: 5000
- **Database**: MySQL (`user_db`)
- **Purpose**: Handles user authentication, registration, and user management

### Key Features

#### Database Connection
- Uses `mysql.connector` with retry logic (3 attempts, 2s delay)
- Custom `DatabaseError` exception
- Auto-initializes database and tables on startup
- Creates test users if database is empty

#### Authentication
- JWT-based authentication using PyJWT
- Token expiration: 24 hours
- Password hashing with bcrypt
- Token validation decorator: `@token_required`
- Role-based access control: `@role_required('admin', 'staff')`

#### Endpoints

**Health Check:**
- `GET /health` - Health check with DB connectivity test

**Authentication:**
- `POST /register` - Register new user (email, password, name, role)
- `POST /login` - User login (returns JWT token)
- `POST /validate-token` - Validate JWT token

**User Management:**
- `GET /users/me` - Get current user profile (authenticated)
- `PUT /users/me` - Update current user profile
- `PUT /users/me/password` - Change password
- `GET /users/<id>` - Get user by ID (with permission check)
- `GET /users` - Get all users (admin/staff only, with pagination)
- `PUT /users/<id>/role` - Update user role (admin only)
- `DELETE /users/<id>` - Delete user (admin only)

#### Database Schema
```sql
users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role ENUM('student', 'staff', 'admin') DEFAULT 'student',
    created_at TIMESTAMP,
    updated_at TIMESTAMP
)
```

#### Test Data
- admin@campus.edu / admin123 (admin)
- student@campus.edu / student123 (student)
- staff@campus.edu / staff123 (staff)

#### Issues/Notes
- Uses MySQL connector (needs PostgreSQL migration)
- Hardcoded port 5000 in startup
- No correlation ID for logging
- Password validation: min 8 chars, must contain digit and letter

---

## 2. REQUEST SERVICE (`request-service` branch)

### Overview
- **File**: `app.py` (1,070 lines)
- **Port**: 5002 (from config)
- **Database**: MySQL (`request_db`)
- **Purpose**: Manages service requests/tickets (maintenance, cleaning, IT support, etc.)

### Key Features

#### Database Connection
- Similar retry logic as user-service
- Auto-initializes with sample requests

#### Authentication
- Validates JWT tokens using shared SECRET_KEY
- Role-based access control
- Users can only see their own requests (unless staff/admin)

#### Inter-Service Communication
- Calls notification service when request status changes
- Uses `requests` library with 2s timeout
- Silent fail if notification service unavailable

#### Endpoints

**Health Check:**
- `GET /health` - Health check with DB connectivity

**Request Management:**
- `POST /requests` - Create new service request (authenticated)
- `GET /requests` - Get requests (with filters: status, category, priority, user_id, pagination)
- `GET /requests/<id>` - Get specific request
- `PUT /requests/<id>` - Update request (users can only update pending requests)
- `DELETE /requests/<id>` - Delete request (users can only delete pending requests)
- `PUT /requests/<id>/status` - Update status (staff/admin only)
- `PUT /requests/<id>/priority` - Update priority (staff/admin only)
- `PUT /requests/<id>/assign` - Assign to staff member (staff/admin only)
- `GET /requests/stats` - Get statistics (staff/admin only)

#### Database Schema
```sql
service_requests (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category ENUM('maintenance', 'cleaning', 'it_support', 'facilities', 'other'),
    location VARCHAR(255),
    priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
    status ENUM('pending', 'in_progress', 'completed', 'cancelled') DEFAULT 'pending',
    admin_notes TEXT,
    assigned_to INT,
    estimated_completion_date DATE,
    actual_completion_date TIMESTAMP,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    INDEXES on user_id, status, category, priority, assigned_to, created_at
)
```

#### Business Logic
- Students cannot set high/urgent priority (auto-downgraded to medium)
- Only pending requests can be updated/deleted by users
- Status change to 'completed' sets actual_completion_date
- Assignment automatically sets status to 'in_progress'

#### Issues/Notes
- Uses MySQL (needs PostgreSQL migration)
- Notification service URL in config
- No correlation ID
- Sample data includes 6 test requests

---

## 3. BOOKING SERVICE (`booking-service` branch)

### Overview
- **File**: `app.py` (520 lines)
- **Port**: 5001 (hardcoded)
- **Database**: MySQL (`booking_db`)
- **Purpose**: Manages room/lab bookings

### Key Features

#### Database Connection
- Uses `Config.DB_HOST`, `Config.DB_USER`, etc. (different naming from other services)
- Retry logic similar to other services

#### Authentication
- Validates user token by calling user-service `/users/me` endpoint
- Uses `validate_user()` function instead of JWT decode
- Role-based filtering (staff/admin see all bookings, users see only their own)

#### Endpoints

**Health Check:**
- `GET /health` - Health check

**Room Management:**
- `GET /rooms` - Get available rooms
- `GET /rooms/<id>/availability` - Check room availability for a date

**Booking Management:**
- `POST /bookings` - Create booking (requires authentication)
- `GET /bookings` - Get bookings (filtered by user role)
- `DELETE /bookings/<id>` - Cancel booking (must be 1 hour before start)

#### Database Schema
```sql
rooms (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    type ENUM('classroom', 'lab', 'meeting_room', 'auditorium', 'other'),
    capacity INT NOT NULL,
    location VARCHAR(255),
    equipment TEXT,
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP
)

bookings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    room_id INT NOT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    purpose VARCHAR(255),
    status ENUM('pending', 'confirmed', 'cancelled', 'completed') DEFAULT 'confirmed',
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES rooms(id),
    INDEXES on user_id, room_id, status, start_time
)
```

#### Business Logic
- Booking cannot exceed 4 hours
- End time must be after start time
- Checks for overlapping bookings before creating
- Cancellation only allowed if at least 1 hour before start time
- Sends notification to user when booking is confirmed

#### Issues/Notes
- **Inconsistent config naming**: Uses `DB_HOST` instead of `MYSQL_HOST`
- Hardcoded port 5001
- Uses MySQL (needs PostgreSQL migration)
- User validation via HTTP call (could be optimized with JWT decode)
- Sample data: 5 rooms (Room 101, Computer Lab A, Conference Room, Chemistry Lab, Auditorium)

---

## 4. NOTIFICATION SERVICE (`notification-service` branch)

### Overview
- **File**: `app.py` (1,121 lines)
- **Port**: 5003 (from config)
- **Database**: MySQL (`notification_db`)
- **Purpose**: Manages notifications and announcements

### Key Features

#### Database Connection
- Standard MySQL connection with retry logic
- Auto-initializes with sample notifications and announcements

#### Authentication
- JWT token validation using shared SECRET_KEY
- Role-based access control

#### Email Functionality
- SMTP email sending (optional, requires EMAIL_USER and EMAIL_PASSWORD)
- Uses `smtplib` and `email.mime`
- Email sending is non-blocking (fails silently if not configured)

#### Endpoints

**Health Check:**
- `GET /health` - Health check (includes email_enabled status)

**Notifications:**
- `POST /notifications` - Create notification (internal use, no auth required)
- `GET /notifications/user/<id>` - Get user notifications (with filters: unread_only, type, pagination)
- `PUT /notifications/<id>/read` - Mark notification as read
- `GET /notifications/unread/count/<id>` - Get unread count
- `PUT /notifications/mark-all-read` - Mark all as read for current user

**Announcements:**
- `POST /announcements` - Create announcement (staff/admin only)
- `GET /announcements` - Get announcements (with filters: audience, pagination)
- `GET /announcements/<id>` - Get specific announcement
- `GET /announcements/recent` - Get recent announcements (last 7 days)

**Admin:**
- `POST /test-email` - Test email sending (admin only)
- `GET /notifications/stats` - Get statistics (staff/admin only)

#### Database Schema
```sql
notifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'general',
    priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
    status ENUM('pending', 'sent', 'failed') DEFAULT 'pending',
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP NULL,
    created_at TIMESTAMP,
    INDEXES on user_id, is_read, type, created_at
)

announcements (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    target_audience ENUM('all', 'students', 'staff', 'admin') DEFAULT 'all',
    created_by INT NOT NULL,
    created_at TIMESTAMP,
    INDEXES on target_audience, created_at
)
```

#### Business Logic
- Notifications can be sent via email if configured
- Announcements filtered by target_audience
- Users can only view their own notifications (unless admin/staff)
- Statistics include read/unread counts, averages, breakdowns by type/priority

#### Issues/Notes
- Uses MySQL (needs PostgreSQL migration)
- Email configuration optional
- Sample data: 6 notifications, 5 announcements
- No correlation ID

---

## 5. API GATEWAY (`api-gateway` branch)

### Overview
- **File**: `app.py` (609 lines)
- **Port**: 8000 (from config)
- **Database**: None (stateless)
- **Purpose**: Routes requests to appropriate microservices

### Key Features

#### Request Forwarding
- Uses `requests` library with retry logic (3 retries, exponential backoff)
- Forwards headers (except Host, Content-Length)
- 30s timeout for service requests
- Handles timeouts and connection errors gracefully

#### Rate Limiting
- In-memory rate limiting (100 requests per minute per IP)
- Uses `@rate_limit_middleware` decorator
- Simple implementation (not production-ready for distributed systems)

#### Authentication
- JWT token validation for protected routes
- Extracts token from Authorization header
- Validates using shared SECRET_KEY

#### Service URLs (from config)
- User Service: `http://localhost:5000`
- Request Service: `http://localhost:5002`
- Booking Service: `http://localhost:5001`
- Notification Service: `http://localhost:5003`

#### Endpoints

**Health & Status:**
- `GET /health` - Gateway health check
- `GET /services/health` - Check health of all services

**Authentication Routes:**
- `POST /api/auth/register` → User Service `/register`
- `POST /api/auth/login` → User Service `/login`
- `POST /api/auth/validate-token` → User Service `/validate-token`

**User Routes:**
- `GET /api/users/me` → User Service `/users/me`
- `PUT /api/users/me` → User Service `/users/me`
- `PUT /api/users/me/password` → User Service `/users/me/password`
- `GET /api/users/<id>` → User Service `/users/<id>`
- `GET /api/users` → User Service `/users`
- `PUT /api/users/<id>/role` → User Service `/users/<id>/role`
- `DELETE /api/users/<id>` → User Service `/users/<id>`

**Request Service Routes:**
- `POST /api/requests` → Request Service `/requests`
- `GET /api/requests` → Request Service `/requests`
- `GET /api/requests/<id>` → Request Service `/requests/<id>`
- `PUT /api/requests/<id>` → Request Service `/requests/<id>`
- `DELETE /api/requests/<id>` → Request Service `/requests/<id>`
- `PUT /api/requests/<id>/status` → Request Service `/requests/<id>/status`
- `PUT /api/requests/<id>/priority` → Request Service `/requests/<id>/priority`
- `PUT /api/requests/<id>/assign` → Request Service `/requests/<id>/assign`
- `GET /api/requests/stats` → Request Service `/requests/stats`

**Booking Service Routes:**
- `GET /api/rooms` → Booking Service `/rooms`
- `GET /api/rooms/<id>/availability` → Booking Service `/rooms/<id>/availability`
- `POST /api/bookings` → Booking Service `/bookings`
- `GET /api/bookings` → Booking Service `/bookings`
- `DELETE /api/bookings/<id>` → Booking Service `/bookings/<id>`

**Notification Service Routes:**
- `POST /api/notifications` → Notification Service `/notifications`
- `GET /api/notifications/user/<id>` → Notification Service `/notifications/user/<id>`
- `PUT /api/notifications/<id>/read` → Notification Service `/notifications/<id>/read`
- `GET /api/notifications/unread/count/<id>` → Notification Service `/notifications/unread/count/<id>`
- `PUT /api/notifications/mark-all-read` → Notification Service `/notifications/mark-all-read`
- `POST /api/announcements` → Notification Service `/announcements`
- `GET /api/announcements` → Notification Service `/announcements`
- `GET /api/announcements/<id>` → Notification Service `/announcements/<id>`
- `GET /api/announcements/recent` → Notification Service `/announcements/recent`
- `GET /api/notifications/stats` → Notification Service `/notifications/stats`

#### Security
- CORS enabled for all origins
- Security headers added (X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, HSTS)
- Rate limiting per IP
- Error handlers for 404, 405, 500, 503

#### Issues/Notes
- No database (stateless - good)
- Rate limiting is in-memory (won't work in distributed setup)
- No correlation ID for request tracing
- All routes use rate limiting middleware
- Service health check aggregates status from all services

---

## Common Patterns Across Services

### Database
- All services use MySQL (`mysql.connector`)
- All have retry logic for DB connections
- All auto-initialize database and tables
- All insert sample data if tables are empty
- **NEEDS MIGRATION TO POSTGRESQL**

### Authentication
- All services use JWT with shared SECRET_KEY
- Token expiration: 24 hours
- Token validation via `@token_required` decorator
- Role-based access: `@role_required('admin', 'staff')`

### Error Handling
- Custom `DatabaseError` exception
- Standard error handlers: 404, 405, 500
- JSON error responses with `success: false`

### Health Checks
- All services have `/health` endpoint
- Health checks include database connectivity test
- Return service name, timestamp, version, DB status

### Configuration
- All use `python-dotenv` for environment variables
- Config classes with defaults
- Inconsistent naming: `MYSQL_HOST` vs `DB_HOST` (booking-service)

### Logging
- Basic logging setup
- **NO CORRELATION ID** (needs to be added)
- Request-level logging missing

### Ports
- User Service: 5000
- Booking Service: 5001
- Request Service: 5002
- Notification Service: 5003
- API Gateway: 8000

---

## Issues to Address

### Critical
1. **MySQL to PostgreSQL Migration** - All services need database migration
2. **Inconsistent Config Naming** - Booking service uses `DB_*` instead of `MYSQL_*`
3. **Hardcoded Ports** - Some services have hardcoded ports instead of using config
4. **No Correlation ID** - Request tracing not implemented
5. **No Docker Compose** - Services not orchestrated together

### Important
6. **Rate Limiting** - API Gateway uses in-memory rate limiting (not distributed)
7. **User Validation** - Booking service makes HTTP call instead of JWT decode
8. **Error Handling** - Could be more consistent across services
9. **Logging** - Needs structured logging with correlation IDs

### Nice to Have
10. **API Documentation** - No OpenAPI/Swagger specs
11. **Testing** - No test files visible
12. **CI/CD** - No GitHub Actions workflows
13. **Monitoring** - No metrics/observability

---

## Next Steps (As Per User Requirements)

1. ✅ **Analyze all branches and app.py files** - COMPLETED
2. ⏳ **Refactor all MySQL databases to PostgreSQL**
3. ⏳ **Test each microservice independently and fix issues**
4. ⏳ **Orchestrate all services (Docker Compose)**
5. ⏳ **Create frontend**

---

## Database Migration Checklist

For each service, need to:
- [ ] Replace `mysql.connector` with `psycopg2` or `psycopg2-binary`
- [ ] Update connection strings (MySQL → PostgreSQL)
- [ ] Update SQL syntax:
  - `AUTO_INCREMENT` → `SERIAL` or `GENERATED ALWAYS AS IDENTITY`
  - `ENUM` → `VARCHAR` with CHECK constraint or separate lookup table
  - `TIMESTAMP` → `TIMESTAMP` (mostly compatible)
  - `DATETIME` → `TIMESTAMP`
  - `BOOLEAN` → `BOOLEAN` (compatible)
- [ ] Update parameter placeholders: `%s` → `%s` (same in psycopg2)
- [ ] Test database initialization
- [ ] Test all CRUD operations
- [ ] Update Dockerfiles if needed
- [ ] Update environment variables

---

## Testing Checklist

For each service:
- [ ] Health check endpoint
- [ ] Authentication endpoints (register, login)
- [ ] CRUD operations
- [ ] Authorization (role-based access)
- [ ] Error handling (invalid input, missing fields)
- [ ] Database connection failures
- [ ] Inter-service communication (where applicable)
- [ ] Edge cases (pagination, empty results, etc.)

---

## Docker Compose Requirements

Need to create:
- [ ] PostgreSQL service(s) - one per microservice or shared?
- [ ] User Service container
- [ ] Request Service container
- [ ] Booking Service container
- [ ] Notification Service container
- [ ] API Gateway container
- [ ] Network configuration
- [ ] Environment variables
- [ ] Volume mounts for data persistence
- [ ] Health checks
- [ ] Service dependencies

---

## Frontend Requirements

Based on the API endpoints, frontend should support:
- [ ] User registration/login
- [ ] Dashboard (user-specific)
- [ ] Service request submission/management
- [ ] Room booking interface
- [ ] Notifications display
- [ ] Announcements view
- [ ] Admin panel (user management, statistics)
- [ ] Staff panel (request management, assignment)
