from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def signup_and_login():
    client.post(
        "/signup",
        json={
            "username": "workout_user",
            "email": "workout_user@example.com",
            "password": "password123",
        },
    )

    response = client.post(
        "/login",
        json={
            "username": "workout_user",
            "password": "password123",
        },
    )

    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_create_and_get_workouts():
    headers = signup_and_login()

    create_response = client.post(
        "/workouts/",
        headers=headers,
        json={
            "name": "Push Day",
            "notes": "Bench focus",
            "exercises": [
                {
                    "name": "Bench Press",
                    "sets": [
                        {"reps": 5, "weight": 185, "set_number": 1},
                        {"reps": 3, "weight": 205, "set_number": 2},
                    ],
                }
            ],
        },
    )

    assert create_response.status_code == 200

    created = create_response.json()
    assert created["name"] == "Push Day"
    assert created["notes"] == "Bench focus"
    assert len(created["exercises"]) == 1
    assert created["exercises"][0]["name"] == "Bench Press"
    assert len(created["exercises"][0]["sets"]) == 2

    get_response = client.get("/workouts/", headers=headers)

    assert get_response.status_code == 200

    workouts = get_response.json()
    assert len(workouts) == 1
    assert workouts[0]["name"] == "Push Day"


def test_pr_estimate_uses_best_set_across_history():
    headers = signup_and_login()

    client.post(
        "/workouts/",
        headers=headers,
        json={
            "name": "Workout 1",
            "notes": None,
            "exercises": [
                {
                    "name": "Bench Press",
                    "sets": [
                        {"reps": 10, "weight": 135, "set_number": 1},
                    ],
                }
            ],
        },
    )

    client.post(
        "/workouts/",
        headers=headers,
        json={
            "name": "Workout 2",
            "notes": None,
            "exercises": [
                {
                    "name": "Bench Press",
                    "sets": [
                        {"reps": 5, "weight": 185, "set_number": 1},
                    ],
                }
            ],
        },
    )

    response = client.get("/workouts/prs/Bench Press", headers=headers)

    assert response.status_code == 200

    data = response.json()
    assert data["exercise"] == "Bench Press"
    assert data["weight"] == 185
    assert data["reps"] == 5
    assert data["estimated_1rm"] == 215.8
    assert data["workout_name"] == "Workout 2"


def test_workout_validation_error():
    headers = signup_and_login()

    response = client.post(
        "/workouts/",
        headers=headers,
        json={
            "name": "",
            "notes": "Bad workout",
            "exercises": [
                {
                    "name": "Bench Press",
                    "sets": [
                        {"reps": 0, "weight": -10, "set_number": 0},
                    ],
                }
            ],
        },
    )

    assert response.status_code == 422