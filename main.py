from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database.mongodb import connect_to_mongo, close_mongo_connection
from .routes import auth, sessions, webrtc
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="Collaborative Whiteboard API",
    description="A real-time collaborative whiteboard application using FastAPI and WebRTC",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["authentication"])
app.include_router(sessions.router, prefix="/api/sessions", tags=["whiteboard sessions"])
app.include_router(webrtc.router, prefix="/api/webrtc", tags=["webrtc"])

# Startup and shutdown events
@app.on_event("startup")
async def startup_event():
    """Connect to MongoDB on startup"""
    await connect_to_mongo()
    logger.info("Application started successfully")

@app.on_event("shutdown")
async def shutdown_event():
    """Close MongoDB connection on shutdown"""
    close_mongo_connection()
    logger.info("Application stopped")

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Collaborative Whiteboard API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "collaborative-whiteboard-api"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)