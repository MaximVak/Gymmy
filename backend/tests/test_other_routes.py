from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def signup_and_login():
    client.post(
        "/signup",
        json={
            "username": "other_routes_user",
            "email": "other_routes_user@example.com",
            "password": "password123",
        },
    )

    response = client.post(
        "/login",
        json={
            "username": "other_routes_user",
            "password": "password123",
        },
    )

    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_create_and_get_templates():
    headers = signup_and_login()

    create_response = client.post(
        "/templates/",
        headers=headers,
        json={
            "name": "Push Template",
            "exercises": [
                {"name": "Bench Press"},
                {"name": "Overhead Press"},
            ],
        },
    )

    assert create_response.status_code == 200

    created = create_response.json()
    assert created["name"] == "Push Template"
    assert len(created["exercises"]) == 2
    assert created["exercises"][0]["name"] == "Bench Press"

    get_response = client.get("/templates/", headers=headers)

    assert get_response.status_code == 200

    templates = get_response.json()
    assert len(templates) == 1
    assert templates[0]["name"] == "Push Template"


def test_template_validation_error():
    headers = signup_and_login()

    response = client.post(
        "/templates/",
        headers=headers,
        json={
            "name": "",
            "exercises": [{"name": ""}],
        },
    )

    assert response.status_code == 422


def test_create_and_get_bodyweight_logs():
    headers = signup_and_login()

    create_response = client.post(
        "/bodyweight/",
        headers=headers,
        json={
            "weight": 180.5,
        },
    )

    assert create_response.status_code == 200

    created = create_response.json()
    assert created["weight"] == 180.5
    assert "date" in created

    get_response = client.get("/bodyweight/", headers=headers)

    assert get_response.status_code == 200

    logs = get_response.json()
    assert len(logs) == 1
    assert logs[0]["weight"] == 180.5


def test_bodyweight_validation_error():
    headers = signup_and_login()

    response = client.post(
        "/bodyweight/",
        headers=headers,
        json={
            "weight": 0,
        },
    )

    assert response.status_code == 422


def test_create_and_get_progress_photos():
    headers = signup_and_login()

    create_response = client.post(
        "/progress-photos/",
        headers=headers,
        json={
            "photo_url": "https://example.com/photo.jpg",
            "notes": "Week 1 progress",
        },
    )

    assert create_response.status_code == 200

    created = create_response.json()
    assert created["photo_url"] == "https://example.com/photo.jpg"
    assert created["notes"] == "Week 1 progress"
    assert "date" in created

    get_response = client.get("/progress-photos/", headers=headers)

    assert get_response.status_code == 200

    photos = get_response.json()
    assert len(photos) == 1
    assert photos[0]["photo_url"] == "https://example.com/photo.jpg"


def test_upload_progress_photo():
    headers = signup_and_login()
    image_content = b"\x89PNG\r\n\x1a\n" + b"progress-photo"

    response = client.post(
        "/progress-photos/upload",
        headers=headers,
        files={
            "file": ("progress.png", image_content, "image/png"),
        },
        data={
            "notes": "Uploaded progress",
        },
    )

    assert response.status_code == 200

    uploaded = response.json()
    assert uploaded["photo_url"].startswith("/uploads/progress_photos/")
    assert uploaded["photo_url"].endswith(".png")
    assert uploaded["notes"] == "Uploaded progress"
    assert "date" in uploaded

    image_response = client.get(uploaded["photo_url"])
    assert image_response.status_code == 200
    assert image_response.content == image_content


def test_upload_progress_photo_rejects_invalid_file_type():
    headers = signup_and_login()

    response = client.post(
        "/progress-photos/upload",
        headers=headers,
        files={
            "file": ("not-a-photo.txt", b"not an image", "text/plain"),
        },
    )

    assert response.status_code == 400


def test_uploaded_progress_photo_appears_in_progress_photo_list():
    headers = signup_and_login()
    image_content = b"\xff\xd8\xff" + b"progress-photo"

    upload_response = client.post(
        "/progress-photos/upload",
        headers=headers,
        files={
            "file": ("progress.jpg", image_content, "image/jpeg"),
        },
    )

    assert upload_response.status_code == 200

    uploaded = upload_response.json()
    get_response = client.get("/progress-photos/", headers=headers)

    assert get_response.status_code == 200

    photos = get_response.json()
    assert len(photos) == 1
    assert photos[0]["photo_url"] == uploaded["photo_url"]


def test_progress_photo_validation_error():
    headers = signup_and_login()

    response = client.post(
        "/progress-photos/",
        headers=headers,
        json={
            "photo_url": "",
            "notes": "Bad photo",
        },
    )

    assert response.status_code == 422
