import pytest
import asyncio
from app.database.mongodb import connect_to_mongo, close_mongo_connection

@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(scope="session", autouse=True)
async def setup_database():
    """Setup test database"""
    await connect_to_mongo()
    yield
    close_mongo_connection()