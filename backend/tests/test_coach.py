from fastapi.testclient import TestClient

from main import app
from routes import coach as coach_routes

client = TestClient(app)


def signup_and_login():
    client.post(
        "/signup",
        json={
            "username": "coach_user",
            "email": "coach_user@example.com",
            "password": "password123",
        },
    )

    response = client.post(
        "/login",
        json={
            "username": "coach_user",
            "password": "password123",
        },
    )

    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_coach_builds_summary_and_returns_mocked_advice(monkeypatch):
    captured = {}

    def mock_generate_coaching_response(summary):
        captured["summary"] = summary
        return {
            "next_session_suggestions": ["Bench with steady volume."],
            "progression_advice": ["Add small weight jumps when reps are clean."],
            "recovery_flags": ["No major recovery flags."],
            "pr_estimate_context": ["Bench estimate is based on 185 lb x 5."],
            "disclaimer": "Training guidance only, not medical advice.",
            "model": "mock-coach",
        }

    monkeypatch.setattr(
        coach_routes,
        "generate_coaching_response",
        mock_generate_coaching_response,
    )

    headers = signup_and_login()

    client.post(
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
                    ],
                }
            ],
        },
    )
    client.post(
        "/bodyweight/",
        headers=headers,
        json={"weight": 181.5},
    )
    client.post(
        "/progress-photos/",
        headers=headers,
        json={
            "photo_url": "https://example.com/progress.jpg",
            "notes": "Week 1",
        },
    )

    response = client.post(
        "/coach/",
        headers=headers,
        json={"focus": "Bench progression"},
    )

    assert response.status_code == 200

    data = response.json()
    summary = data["summary"]

    assert data["model"] == "mock-coach"
    assert data["next_session_suggestions"] == ["Bench with steady volume."]
    assert summary["focus"] == "Bench progression"
    assert summary["user"]["username"] == "coach_user"
    assert summary["recent_workouts"][0]["name"] == "Push Day"
    assert summary["recent_workouts"][0]["exercises"][0]["name"] == "Bench Press"
    assert summary["best_pr_estimates"][0]["estimated_1rm"] == 215.8
    assert summary["bodyweight_trend"]["current_weight"] == 181.5
    assert summary["progress_photos"]["count"] == 1
    assert captured["summary"]["focus"] == "Bench progression"


def test_coach_returns_clear_error_without_openai_key(monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    headers = signup_and_login()

    response = client.post("/coach/", headers=headers, json={})

    assert response.status_code == 503
    assert response.json()["detail"] == "OPENAI_API_KEY is not configured"
