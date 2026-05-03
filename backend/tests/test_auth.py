from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def test_signup_success():
    response = client.post(
        "/signup",
        json={
            "username": "testuser_auth",
            "email": "testuser_auth@example.com",
            "password": "password123",
        },
    )

    assert response.status_code == 200

    data = response.json()
    assert data["username"] == "testuser_auth"
    assert data["email"] == "testuser_auth@example.com"
    assert "id" in data
    assert "created_at" in data
    assert "hashed_password" not in data


def test_signup_validation_error():
    response = client.post(
        "/signup",
        json={
            "username": "ab",
            "email": "not-an-email",
            "password": "123",
        },
    )

    assert response.status_code == 422


def test_login_success():
    client.post(
        "/signup",
        json={
            "username": "testuser_login",
            "email": "testuser_login@example.com",
            "password": "password123",
        },
    )

    response = client.post(
        "/login",
        json={
            "username": "testuser_login",
            "password": "password123",
        },
    )

    assert response.status_code == 200

    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_login_wrong_password():
    client.post(
        "/signup",
        json={
            "username": "testuser_wrong_password",
            "email": "testuser_wrong_password@example.com",
            "password": "password123",
        },
    )

    response = client.post(
        "/login",
        json={
            "username": "testuser_wrong_password",
            "password": "wrongpassword",
        },
    )

    assert response.status_code == 401