import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # PostgreSQL Configuration
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_USER = os.getenv("DB_USER", "postgres")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "postgres")
    DB_NAME = os.getenv("DB_NAME", "booking_db")
    DB_PORT = os.getenv("DB_PORT", "5432")
    
    # Application Configuration
    PORT = int(os.getenv("PORT", "5001"))
    DEBUG = os.getenv("DEBUG", "False").lower() == "true"
    
    # JWT Configuration
    SECRET_KEY = os.getenv("SECRET_KEY", "campus-services-secret-key")
    JWT_EXPIRATION_HOURS = int(os.getenv("JWT_EXPIRATION_HOURS", "24"))
    
    # Service URLs
    USER_SERVICE_URL = os.getenv("USER_SERVICE_URL", "http://localhost:5000")
    NOTIFICATION_SERVICE_URL = os.getenv("NOTIFICATION_SERVICE_URL", "http://localhost:5003")
