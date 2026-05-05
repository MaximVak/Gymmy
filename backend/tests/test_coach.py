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
            "direct_answer": "Your current best estimated 1RM is 215.8 lb, based on 185 lb x 5.",
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
    client.put(
        "/nutrition/goals",
        headers=headers,
        json={
            "calories": 2500,
            "protein": 180,
            "carbs": 275,
            "fat": 70,
        },
    )

    response = client.post(
        "/coach/",
        headers=headers,
        json={
            "focus": "Bench progression",
            "messages": [
                {
                    "role": "user",
                    "content": "What is my best bench estimate?",
                },
                {
                    "role": "assistant",
                    "content": "Your best estimate is 215.8 lb.",
                },
                {
                    "role": "user",
                    "content": "How should I progress it?",
                },
            ],
        },
    )

    assert response.status_code == 200

    data = response.json()
    summary = data["summary"]

    assert data["model"] == "mock-coach"
    assert data["direct_answer"] == "Your current best estimated 1RM is 215.8 lb, based on 185 lb x 5."
    assert summary["focus"] == "Bench progression"
    assert summary["units"]["system"] == "imperial"
    assert summary["units"]["weight"] == "lb"
    assert "Do not use kilograms" in summary["units"]["display_rule"]
    assert summary["user"]["username"] == "coach_user"
    assert summary["recent_workouts"][0]["name"] == "Push Day"
    assert summary["recent_workouts"][0]["exercises"][0]["name"] == "Bench Press"
    assert summary["best_pr_estimates"][0]["estimated_1rm"] == 215.8
    assert summary["bodyweight_trend"]["current_weight"] == 181.5
    assert summary["nutrition_goal"]["calories"] == 2500
    assert summary["nutrition_goal"]["protein"] == 180
    assert summary["progress_photos"]["count"] == 1
    assert captured["summary"]["focus"] == "Bench progression"
    assert captured["summary"]["conversation_history"][-1]["content"] == "How should I progress it?"


def test_coach_returns_clear_error_without_openai_key(monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    headers = signup_and_login()

    response = client.post("/coach/", headers=headers, json={})

    assert response.status_code == 503
    assert response.json()["detail"] == "OPENAI_API_KEY is not configured"


def test_coach_accepts_general_lifting_questions(monkeypatch):
    captured = {}

    def mock_generate_coaching_response(summary):
        captured["summary"] = summary
        return {
            "direct_answer": "Both can grow your chest; barbell bench is better for heavy loading, while dumbbell press gives more range of motion.",
            "disclaimer": "Training guidance only, not medical advice.",
            "model": "mock-coach",
        }

    monkeypatch.setattr(
        coach_routes,
        "generate_coaching_response",
        mock_generate_coaching_response,
    )

    headers = signup_and_login()
    question = "What's better for chest growth, dumbbell press or barbell bench?"

    response = client.post(
        "/coach/",
        headers=headers,
        json={"focus": question},
    )

    assert response.status_code == 200

    data = response.json()
    assert "barbell bench" in data["direct_answer"]
    assert captured["summary"]["focus"] == question
