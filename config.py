import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class Config:
    # PostgreSQL Configuration
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_USER = os.getenv("DB_USER", "postgres")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "postgres")
    DB_NAME = os.getenv("DB_NAME", "user_db")
    DB_PORT = os.getenv("DB_PORT", "5432")
    
    # Application Configuration
    PORT = int(os.getenv("PORT", "5000"))
    DEBUG = os.getenv("DEBUG", "False").lower() == "true"
    
    # JWT Configuration
    SECRET_KEY = os.getenv("SECRET_KEY", "campus-services-secret-key-change-in-production")
    JWT_EXPIRATION_HOURS = int(os.getenv("JWT_EXPIRATION_HOURS", "24"))
    
    # CORS Configuration
    CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*").split(",")
