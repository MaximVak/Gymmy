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
                {
                    "name": "Bench Press",
                    "sets": [
                        {"set_number": 1, "reps": 8, "weight": 185},
                        {"set_number": 2, "reps": 6, "weight": 195},
                    ],
                },
                {
                    "name": "Overhead Press",
                    "sets": [
                        {"set_number": 1, "reps": 10, "weight": 95},
                    ],
                },
            ],
        },
    )

    assert create_response.status_code == 200

    created = create_response.json()
    assert created["name"] == "Push Template"
    assert len(created["exercises"]) == 2
    assert created["exercises"][0]["name"] == "Bench Press"
    assert created["exercises"][0]["sets"][0]["reps"] == 8
    assert created["exercises"][0]["sets"][0]["weight"] == 185

    get_response = client.get("/templates/", headers=headers)

    assert get_response.status_code == 200

    templates = get_response.json()
    assert len(templates) == 1
    assert templates[0]["name"] == "Push Template"
    assert templates[0]["exercises"][1]["sets"][0]["weight"] == 95

    update_response = client.put(
        f"/templates/{created['id']}",
        headers=headers,
        json={
            "name": "Heavy Push Template",
            "exercises": [
                {
                    "name": "Incline Dumbbell Press",
                    "sets": [
                        {"set_number": 1, "reps": 10, "weight": 80},
                        {"set_number": 2, "reps": 8, "weight": 85},
                    ],
                },
            ],
        },
    )

    assert update_response.status_code == 200

    updated = update_response.json()
    assert updated["name"] == "Heavy Push Template"
    assert len(updated["exercises"]) == 1
    assert updated["exercises"][0]["name"] == "Incline Dumbbell Press"
    assert updated["exercises"][0]["sets"][1]["reps"] == 8
    assert updated["exercises"][0]["sets"][1]["weight"] == 85


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


def test_create_get_and_delete_nutrition_entries():
    headers = signup_and_login()

    create_response = client.post(
        "/nutrition/",
        headers=headers,
        json={
            "item_name": "Chicken rice bowl",
            "calories": 650,
            "protein": 45,
            "carbs": 70,
            "fat": 18,
            "date": "2026-05-05T12:00:00Z",
        },
    )

    assert create_response.status_code == 200

    created = create_response.json()
    assert created["item_name"] == "Chicken rice bowl"
    assert created["calories"] == 650
    assert created["protein"] == 45
    assert created["carbs"] == 70
    assert created["fat"] == 18

    get_response = client.get(
        "/nutrition/",
        headers=headers,
        params={"date": "2026-05-05"},
    )

    assert get_response.status_code == 200

    entries = get_response.json()
    assert len(entries) == 1
    assert entries[0]["item_name"] == "Chicken rice bowl"

    delete_response = client.delete(
        f"/nutrition/{created['id']}",
        headers=headers,
    )

    assert delete_response.status_code == 200

    empty_response = client.get(
        "/nutrition/",
        headers=headers,
        params={"date": "2026-05-05"},
    )

    assert empty_response.status_code == 200
    assert empty_response.json() == []


def test_create_and_update_nutrition_goals():
    headers = signup_and_login()

    empty_response = client.get("/nutrition/goals", headers=headers)

    assert empty_response.status_code == 200
    assert empty_response.json() is None

    create_response = client.put(
        "/nutrition/goals",
        headers=headers,
        json={
            "calories": 2600,
            "protein": 180,
            "carbs": 300,
            "fat": 75,
        },
    )

    assert create_response.status_code == 200

    created = create_response.json()
    assert created["calories"] == 2600
    assert created["protein"] == 180
    assert created["carbs"] == 300
    assert created["fat"] == 75

    update_response = client.put(
        "/nutrition/goals",
        headers=headers,
        json={
            "calories": 2400,
            "protein": 175,
            "carbs": 250,
            "fat": 70,
        },
    )

    assert update_response.status_code == 200

    updated = update_response.json()
    assert updated["id"] == created["id"]
    assert updated["calories"] == 2400
    assert updated["protein"] == 175
    assert updated["carbs"] == 250
    assert updated["fat"] == 70

    get_response = client.get("/nutrition/goals", headers=headers)

    assert get_response.status_code == 200
    assert get_response.json()["calories"] == 2400


def test_nutrition_validation_error():
    headers = signup_and_login()

    response = client.post(
        "/nutrition/",
        headers=headers,
        json={
            "item_name": "",
            "calories": -1,
            "protein": 0,
            "carbs": 0,
            "fat": 0,
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
