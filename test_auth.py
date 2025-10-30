import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_register_user():
    """Test user registration"""
    response = client.post("/api/auth/register", json={
        "username": "testuser",
        "email": "test@example.com",
        "password": "testpassword123"
    })
    assert response.status_code == 201
    data = response.json()
    assert data["username"] == "testuser"
    assert data["email"] == "test@example.com"
    assert "id" in data

def test_register_duplicate_user():
    """Test registration with duplicate username"""
    response = client.post("/api/auth/register", json={
        "username": "testuser",
        "email": "test2@example.com",
        "password": "testpassword123"
    })
    assert response.status_code == 400
    assert "Username already registered" in response.json()["detail"]

def test_login_user():
    """Test user login"""
    response = client.post("/api/auth/login", data={
        "username": "testuser",
        "password": "testpassword123"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"

def test_login_invalid_credentials():
    """Test login with invalid credentials"""
    response = client.post("/api/auth/login", data={
        "username": "testuser",
        "password": "wrongpassword"
    })
    assert response.status_code == 401
    assert "Incorrect username or password" in response.json()["detail"]

def test_get_current_user():
    """Test getting current user info"""
    # First login to get token
    login_response = client.post("/api/auth/login", data={
        "username": "testuser",
        "password": "testpassword123"
    })
    token = login_response.json()["access_token"]
    
    # Use token to get current user
    response = client.get("/api/auth/me", headers={
        "Authorization": f"Bearer {token}"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "testuser"
    assert data["email"] == "test@example.com"

def test_get_current_user_invalid_token():
    """Test getting current user with invalid token"""
    response = client.get("/api/auth/me", headers={
        "Authorization": "Bearer invalid_token"
    })
    assert response.status_code == 401