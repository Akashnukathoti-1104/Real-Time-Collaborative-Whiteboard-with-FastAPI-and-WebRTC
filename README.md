# Real-Time Collaborative Whiteboard with FastAPI and WebRTC

A cutting-edge web application that enables multiple users to draw, sketch, and collaborate on a shared digital canvas in real-time. This project leverages WebRTC for peer-to-peer communication to minimize server load and ensure ultra-low latency drawing updates, making it ideal for remote collaboration, online education, and creative brainstorming sessions.

Built with FastAPI for the backend and HTML5 Canvas for the frontend, this application demonstrates advanced web development techniques including real-time communication, NoSQL data persistence, and modern authentication practices.

## Features

- **Real-Time Drawing**: Multiple users can draw simultaneously with instant synchronization
- **WebRTC P2P Communication**: Direct peer-to-peer connections minimize server load and latency
- **Advanced Drawing Tools**: Pen, eraser, shapes, colors, and line width options
- **Session Management**: Create and join collaborative whiteboard rooms
- **Persistent Storage**: Save and load whiteboard states using MongoDB
- **JWT Authentication**: Secure token-based access control
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Export Functionality**: Save your whiteboard as an image
- **Undo/Redo Support**: Full history management for drawing actions
- **Collaborator Management**: Add users by username to private sessions
- **Fullscreen Mode**: Immersive drawing experience
- **Touch Support**: Works on tablets and touch devices

## Technology Stack

- **Backend**: FastAPI, WebRTC, MongoDB, JWT, Pydantic, aiortc
- **Frontend**: HTML5 Canvas, JavaScript ES6+, Bootstrap 5, WebSocket API
- **Database**: MongoDB with flexible document storage
- **Authentication**: JWT tokens with secure password hashing
- **DevOps**: Docker, Docker Compose, Uvicorn ASGI server
- **Real-time Communication**: WebRTC data channels and WebSocket signaling

## Quick Start

### Prerequisites

- Python 3.9+
- MongoDB 4.4+
- Node.js 14+ (for frontend development)
- Docker & Docker Compose (optional but recommended)

### Installation with Docker (Recommended)

1. Clone the repository:
```bash
git clone https://github.com/yourusername/collaborative-whiteboard.git
cd collaborative-whiteboard
```
2.Start the application:
```bash
docker-compose up --build
```
3.Access the application:
```bash
Frontend: http://localhost:3000
Backend API: http://localhost:8000
API Docs: http://localhost:8000/docs
```
Manual Installation
Backend Setup:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```
Frontend Setup:
```bash
cd frontend
npm install
npm start
```
📖 Usage
Register/Login: Create an account or login with existing credentials.
Create Whiteboard: Start a new collaborative session.
Invite Collaborators: Share the session link or add users by username.
Draw & Collaborate: Use drawing tools to create together in real-time.
Save Work: Export your canvas as an image or save to the cloud.

📁 Project Structure
collaborative-whiteboard/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI entry point
│   │   ├── models/              # Pydantic data models
│   │   ├── routes/              # API endpoints (auth, sessions, webrtc)
│   │   ├── services/            # Business logic (auth, whiteboard, webrtc signaling)
│   │   └── database/            # MongoDB connection
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── js/                  # JS modules (app, canvas, webrtc, auth)
│   │   └── css/
│   └── Dockerfile
├── docker-compose.yml           # Multi-container orchestration
└── .env.example                 # Environment variables template


📊 API Documentation
The FastAPI application automatically generates interactive OpenAPI documentation at http://localhost:8000/docs.

🔧 Configuration:
Create a .env file in the root directory and configure the following variables:
```bash
docker-compose up --build
MONGO_URI=mongodb://admin:password@localhost:27017/whiteboard_db?authSource=admin
DB_NAME=whiteboard_db
SECRET_KEY=your-secret-key-change-in-production
```
🧪 Testing
Run the test suite for the backend:
```bash
# Backend tests
cd backend
pytest
```
📈 Performance
Latency: $<50 for drawing updates with WebRTC P2P.
Concurrent Users: Supports $50+$ simultaneous users per session.
Data Transfer: Optimized drawing data transmission format.

🔒 Security Features
JWT Authentication: Secure token-based access control.
Password Hashing: Bcrypt for secure password storage.
CORS Protection: Configurable origin whitelist.
Input Validation: Robust data validation using Pydantic models.

🤝 Contributing
Contributions are welcome! Please follow these steps:
Fork the repository.
Create a feature branch (git checkout -b feature/AmazingFeature).
Commit your changes (git commit -m 'Add some AmazingFeature').
Push to the branch (git push origin feature/AmazingFeature).
Open a Pull Request.

📝 License
This project is licensed under the MIT License - see the LICENSE file for details.

🙏 Acknowledgments
FastAPI - The web framework used.
WebRTC - Real-time communication capabilities.
MongoDB - Database solution.

📞 Contact

My Name-N.Akash/Akashnukathoti-1104-Akashnukathoti147@gmail.com

Project Link: https://github.com/Akashnukathoti-1104/Real-Time-Collaborative-Whiteboard-with-FastAPI-and-WebRTC.
