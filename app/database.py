from sqlalchemy import create_engine, event, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import OperationalError
import os
import time
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Get database URL from environment variable
DATABASE_URL = os.environ.get("DATABASE_URL", "")

# Create SQLAlchemy engine with improved connection settings
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,  # Detect stale connections
    pool_recycle=3600,   # Recycle connections every hour to avoid stale connections
    pool_size=10,        # Increase connection pool size 
    max_overflow=20,     # Allow up to 20 overflow connections
    connect_args={"connect_timeout": 10}  # Timeout for new connections
)

# Set up event listener for checkout to handle potential connection failures
@event.listens_for(engine, "connect")
def connect(dbapi_connection, connection_record):
    logger.info("Database connection established")

@event.listens_for(engine, "checkout")
def checkout(dbapi_connection, connection_record, connection_proxy):
    logger.debug("Database connection retrieved from pool")

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()

# Dependency to get database session with retry mechanism
def get_db():
    max_retries = 3
    retry_count = 0
    
    while retry_count < max_retries:
        db = None
        try:
            db = SessionLocal()
            # Test connection
            db.execute(text("SELECT 1"))
            logger.debug("Database connection successful")
            try:
                yield db
            finally:
                if db:
                    logger.debug("Closing database connection")
                    db.close()
            return
        except OperationalError as e:
            retry_count += 1
            logger.warning(f"Database connection error (attempt {retry_count}/{max_retries}): {e}")
            # Close potentially stale connection
            if db:
                try:
                    db.close()
                except Exception as close_error:
                    logger.error(f"Error closing database connection: {close_error}")
            
            if retry_count < max_retries:
                # Wait before retrying (exponential backoff)
                backoff_time = 0.5 * (2 ** retry_count)
                logger.info(f"Retrying database connection in {backoff_time} seconds")
                time.sleep(backoff_time)
            else:
                logger.error("Failed to connect to database after multiple attempts")
                raise