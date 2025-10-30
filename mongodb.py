from pymongo import MongoClient
from pymongo.errors import ConnectionFailure
import os
from dotenv import load_dotenv

load_dotenv()

# MongoDB connection
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "whiteboard_db")

client = None
db = None

async def connect_to_mongo():
    """Connect to MongoDB"""
    global client, db
    try:
        client = MongoClient(MONGO_URI)
        db = client[DB_NAME]
        # Test connection
        client.admin.command('ping')
        print("✅ Connected to MongoDB!")
        return True
    except ConnectionFailure as e:
        print(f"❌ Could not connect to MongoDB: {e}")
        return False

def get_db():
    """Get database instance"""
    return db

def close_mongo_connection():
    """Close MongoDB connection"""
    global client
    if client:
        client.close()
        print("MongoDB connection closed")