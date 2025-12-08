# Booking Service

## Overview

Microservice for managing room and lab bookings in the Campus Services Hub.

## Database Setup

### PostgreSQL Initialization

The database schema and initial data are defined in `init.sql`. This script will be automatically executed when PostgreSQL container starts (if configured in docker-compose).

#### Manual Setup

If running PostgreSQL manually, execute the init script:

```bash
psql -U postgres -d booking_db -f init.sql
```

Or connect to PostgreSQL and run:

```bash
psql -U postgres
CREATE DATABASE booking_db;
\c booking_db
\i init.sql
```

### Database Schema

- **rooms**: Stores room information (name, type, capacity, location, equipment)
- **bookings**: Stores booking records with foreign key to rooms

## Configuration

Environment variables (can be set in `.env` file):

- `DB_HOST`: PostgreSQL host (default: `localhost`)
- `DB_PORT`: PostgreSQL port (default: `5432`)
- `DB_USER`: PostgreSQL user (default: `postgres`)
- `DB_PASSWORD`: PostgreSQL password (default: `postgres`)
- `DB_NAME`: Database name (default: `booking_db`)
- `PORT`: Service port (default: `5001`)
- `DEBUG`: Debug mode (default: `False`)
- `SECRET_KEY`: JWT secret key
- `USER_SERVICE_URL`: User service URL (default: `http://localhost:5000`)
- `NOTIFICATION_SERVICE_URL`: Notification service URL (default: `http://localhost:5003`)

## Running the Service

### With Docker

```bash
docker build -t booking-service .
docker run -p 5001:5001 --env-file .env booking-service
```

### Without Docker

1. Install dependencies:

```bash
pip install -r requirements.txt
```

2. Set up PostgreSQL and run init.sql

3. Run the service:

```bash
python app.py
```

## API Endpoints

- `GET /health` - Health check
- `GET /rooms` - Get available rooms
- `GET /rooms/<id>/availability` - Check room availability for a date
- `POST /bookings` - Create a booking (requires authentication)
- `GET /bookings` - Get bookings (filtered by user role)
- `DELETE /bookings/<id>` - Cancel a booking

