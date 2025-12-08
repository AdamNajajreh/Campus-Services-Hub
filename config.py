"""
Configuration for Notification Service
"""

import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class Config:
    """Application configuration"""
    
    # PostgreSQL Configuration
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_USER = os.getenv("DB_USER", "postgres")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "postgres")
    DB_NAME = os.getenv("DB_NAME", "notification_db")
    DB_PORT = os.getenv("DB_PORT", "5432")
    
    # Application Configuration
    PORT = int(os.getenv("PORT", "5003"))
    DEBUG = os.getenv("DEBUG", "False").lower() == "true"
    
    # JWT Configuration (shared with other services)
    SECRET_KEY = os.getenv("SECRET_KEY", "campus-services-secret-key")
    
    # Email Configuration
    EMAIL_HOST = os.getenv("EMAIL_HOST", "smtp.gmail.com")
    EMAIL_PORT = int(os.getenv("EMAIL_PORT", "587"))
    EMAIL_USER = os.getenv("EMAIL_USER", "")
    EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD", "")
    FROM_EMAIL = os.getenv("FROM_EMAIL", "noreply@campus.edu")
    
    # Notification Service Specific Configuration
    DEFAULT_NOTIFICATION_TYPE = "general"
    VALID_NOTIFICATION_TYPES = ["general", "request_update", "booking_confirmed", 
                                "announcement", "urgent", "system"]
    
    VALID_PRIORITIES = ["low", "medium", "high"]
    VALID_TARGET_AUDIENCES = ["all", "students", "staff", "admin"]
    
    # Email settings
    SEND_EMAIL_ENABLED = EMAIL_USER and EMAIL_PASSWORD
    EMAIL_SUBJECT_PREFIX = "[Campus Services] "
    
    @classmethod
    def validate_config(cls):
        """Validate required configuration"""
        required_vars = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME']
        missing = [var for var in required_vars if not getattr(cls, var)]
        
        if missing:
            raise ValueError(f"Missing required environment variables: {missing}")