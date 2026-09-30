import os
from pymongo import MongoClient
from motor.motor_asyncio import AsyncIOMotorClient
import logging

logger = logging.getLogger(__name__)

# Get MongoDB URL from environment variable
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "clan_nexus")

# Create MongoDB clients
client = AsyncIOMotorClient(MONGO_URL)
sync_client = MongoClient(MONGO_URL)

# Get database
db = client[DB_NAME]
sync_db = sync_client[DB_NAME]

async def ensure_indexes():
    """Ensure all required indexes are created"""
    try:
        # Create indexes for collections
        await db.users.create_index("email", unique=True)
        await db.groups.create_index("name", unique=True)
        await db.transactions.create_index("user_id")
        await db.coupons.create_index("code", unique=True)
        await db.status_checks.create_index("timestamp")
        logger.info("Indexes created successfully")
    except Exception as e:
        logger.error(f"Error creating indexes: {e}")
        raise

def close_connection():
    """Close database connection"""
    try:
        sync_client.close()
        logger.info("Database connection closed")
    except Exception as e:
        logger.error(f"Error closing database connection: {e}")
