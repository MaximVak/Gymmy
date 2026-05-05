import json
import os
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import auth
import models
import schemas
from database import get_db

router = APIRouter(prefix="/coach", tags=["Coach"])

DEFAULT_COACH_MODEL = "gpt-5-mini"

UNIT_PREFERENCE = {
    "system": "imperial",
    "weight": "lb",
    "bodyweight": "lb",
    "volume": "lb",
    "estimated_1rm": "lb",
    "display_rule": (
        "Use pounds (lb/lbs) for all weights. Do not use kilograms unless the "
        "user explicitly asks for a metric conversion."
    ),
    "dumbbell_rule": (
        "For dumbbell exercises, logged weight means the weight of one dumbbell "
        "unless the user notes otherwise."
    ),
}

COACH_RESPONSE_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "direct_answer": {"type": "string"},
        "disclaimer": {"type": "string"},
    },
    "required": [
        "direct_answer",
        "disclaimer",
    ],
}


def calculate_1rm(weight: float, reps: int) -> float:
    if reps == 1:
        return weight

    return round(weight * (1 + reps / 30), 1)


def as_utc(value: datetime | None) -> datetime | None:
    if value is None:
        return None

    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)

    return value.astimezone(timezone.utc)


def serialize_workout(workout: models.Workout) -> dict[str, Any]:
    exercises = []

    for exercise in workout.exercises:
        sets = [
            {
                "set_number": workout_set.set_number,
                "reps": workout_set.reps,
                "weight": workout_set.weight,
                "estimated_1rm": calculate_1rm(workout_set.weight, workout_set.reps),
            }
            for workout_set in exercise.sets
        ]
        volume = sum(workout_set["reps"] * workout_set["weight"] for workout_set in sets)
        best_set = max(sets, key=lambda workout_set: workout_set["estimated_1rm"], default=None)

        exercises.append(
            {
                "name": exercise.name,
                "sets": sets,
                "volume": volume,
                "best_set": best_set,
            }
        )

    return {
        "id": workout.id,
        "name": workout.name,
        "date": as_utc(workout.date).isoformat() if workout.date else None,
        "notes": workout.notes,
        "exercise_count": len(exercises),
        "total_volume": sum(exercise["volume"] for exercise in exercises),
        "exercises": exercises,
    }


def get_best_pr_estimates(workouts: list[models.Workout]) -> list[dict[str, Any]]:
    best_by_exercise = {}

    for workout in workouts:
        for exercise in workout.exercises:
            for workout_set in exercise.sets:
                estimated_1rm = calculate_1rm(workout_set.weight, workout_set.reps)
                current_best = best_by_exercise.get(exercise.name.lower())

                if current_best is None or estimated_1rm > current_best["estimated_1rm"]:
                    best_by_exercise[exercise.name.lower()] = {
                        "exercise": exercise.name,
                        "weight": workout_set.weight,
                        "reps": workout_set.reps,
                        "set_number": workout_set.set_number,
                        "estimated_1rm": estimated_1rm,
                        "workout_id": workout.id,
                        "workout_name": workout.name,
                        "date": as_utc(workout.date).isoformat() if workout.date else None,
                    }

    return sorted(
        best_by_exercise.values(),
        key=lambda estimate: estimate["estimated_1rm"],
        reverse=True,
    )[:8]


def get_bodyweight_trend(logs: list[models.BodyweightLog]) -> dict[str, Any]:
    if not logs:
        return {
            "log_count": 0,
            "current_weight": None,
            "previous_weight": None,
            "change": None,
            "direction": "unknown",
            "recent_logs": [],
        }

    current = logs[-1]
    previous = logs[-2] if len(logs) > 1 else None
    change = round(current.weight - previous.weight, 1) if previous else None

    if change is None:
        direction = "unknown"
    elif change > 0:
        direction = "up"
    elif change < 0:
        direction = "down"
    else:
        direction = "flat"

    return {
        "log_count": len(logs),
        "current_weight": current.weight,
        "previous_weight": previous.weight if previous else None,
        "change": change,
        "direction": direction,
        "recent_logs": [
            {
                "weight": log.weight,
                "date": as_utc(log.date).isoformat() if log.date else None,
            }
            for log in logs[-10:]
        ],
    }


def get_training_frequency(workouts: list[models.Workout]) -> dict[str, Any]:
    now = datetime.now(timezone.utc)
    seven_days_ago = now - timedelta(days=7)
    thirty_days_ago = now - timedelta(days=30)

    dated_workouts = [
        (workout, as_utc(workout.date)) for workout in workouts if workout.date
    ]
    workouts_last_7_days = [
        workout for workout, workout_date in dated_workouts if workout_date >= seven_days_ago
    ]
    workouts_last_30_days = [
        workout for workout, workout_date in dated_workouts if workout_date >= thirty_days_ago
    ]
    latest_workout = max(
        dated_workouts,
        key=lambda workout_with_date: workout_with_date[1],
        default=None,
    )
    latest_workout_date = latest_workout[1] if latest_workout else None

    return {
        "workouts_last_7_days": len(workouts_last_7_days),
        "workouts_last_30_days": len(workouts_last_30_days),
        "days_since_last_workout": (
            (now.date() - latest_workout_date.date()).days
            if latest_workout_date
            else None
        ),
        "recent_training_days": sorted(
            {
                workout_date.date().isoformat()
                for _, workout_date in dated_workouts
                if workout_date >= thirty_days_ago
            },
            reverse=True,
        ),
    }


def get_recovery_signals(
    recent_workouts: list[dict[str, Any]],
    frequency: dict[str, Any],
    bodyweight_trend: dict[str, Any],
) -> list[str]:
    signals = []

    if frequency["workouts_last_7_days"] >= 6:
        signals.append("High training frequency in the last 7 days")

    if frequency["days_since_last_workout"] is not None and frequency["days_since_last_workout"] >= 5:
        signals.append("Training has been paused for several days")

    if len(recent_workouts) >= 2:
        latest_volume = recent_workouts[0]["total_volume"]
        previous_volume = recent_workouts[1]["total_volume"]

        if previous_volume and latest_volume > previous_volume * 1.5:
            signals.append("Latest workout volume increased sharply")

    if bodyweight_trend["log_count"] == 0:
        signals.append("No bodyweight trend available yet")

    if not signals:
        signals.append("No obvious recovery flags from the available data")

    return signals


def build_coaching_summary(
    db: Session,
    current_user: models.User,
    focus: str | None = None,
    messages: list[schemas.CoachMessage] | None = None,
) -> dict[str, Any]:
    workouts = (
        db.query(models.Workout)
        .filter(models.Workout.user_id == current_user.id)
        .order_by(models.Workout.date.desc())
        .all()
    )
    bodyweight_logs = (
        db.query(models.BodyweightLog)
        .filter(models.BodyweightLog.user_id == current_user.id)
        .order_by(models.BodyweightLog.date.asc())
        .all()
    )
    photos = (
        db.query(models.ProgressPhoto)
        .filter(models.ProgressPhoto.user_id == current_user.id)
        .order_by(models.ProgressPhoto.date.desc())
        .all()
    )
    nutrition_goal = (
        db.query(models.NutritionGoal)
        .filter(models.NutritionGoal.user_id == current_user.id)
        .first()
    )

    recent_workouts = [serialize_workout(workout) for workout in workouts[:10]]
    bodyweight_trend = get_bodyweight_trend(bodyweight_logs)
    training_frequency = get_training_frequency(workouts)

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "units": UNIT_PREFERENCE,
        "user": {
            "id": current_user.id,
            "username": current_user.username,
        },
        "focus": focus,
        "conversation_history": [
            {
                "role": message.role,
                "content": message.content,
            }
            for message in (messages or [])
        ],
        "recent_workouts": recent_workouts,
        "best_pr_estimates": get_best_pr_estimates(workouts),
        "bodyweight_trend": bodyweight_trend,
        "nutrition_goal": (
            {
                "calories": nutrition_goal.calories,
                "protein": nutrition_goal.protein,
                "carbs": nutrition_goal.carbs,
                "fat": nutrition_goal.fat,
                "updated_at": (
                    as_utc(nutrition_goal.updated_at).isoformat()
                    if nutrition_goal.updated_at
                    else None
                ),
            }
            if nutrition_goal
            else None
        ),
        "training_frequency": training_frequency,
        "recovery_signals": get_recovery_signals(
            recent_workouts,
            training_frequency,
            bodyweight_trend,
        ),
        "progress_photos": {
            "count": len(photos),
            "latest": (
                {
                    "date": as_utc(photos[0].date).isoformat() if photos[0].date else None,
                    "notes": photos[0].notes,
                }
                if photos
                else None
            ),
        },
    }


def generate_coaching_response(summary: dict[str, Any]) -> dict[str, Any]:
    api_key = os.getenv("OPENAI_API_KEY")

    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="OPENAI_API_KEY is not configured",
        )

    try:
        from openai import OpenAI
    except ImportError as exc:
        raise HTTPException(
            status_code=503,
            detail="OpenAI SDK is not installed. Run pip install -r requirements.txt.",
        ) from exc

    model = os.getenv("OPENAI_MODEL", DEFAULT_COACH_MODEL)
    client = OpenAI(api_key=api_key)

    try:
        response = client.responses.create(
            model=model,
            instructions=(
                "You are Gymmy Coach, a supportive but direct strength-training assistant. "
                "Answer the user's focus question in direct_answer. "
                "Use conversation_history for follow-up questions, preserving the context of earlier user questions and your prior answers. "
                "All Gymmy weights in the provided summary are pounds, including set weights, bodyweight, workout volume, and estimated PRs. "
                "Use lb/lbs for all weight numbers in direct_answer, and never convert to kg/kilograms unless the user explicitly asks for metric conversion. "
                "For dumbbell exercises, assume a logged dumbbell weight is the weight of one dumbbell unless the user says otherwise. "
                "If the question is about the user's own training, lifts, PRs, bodyweight, progress, or logged history, use the provided Gymmy data. "
                "If the question is about diet, calorie targets, or macro targets, answer directly from broadly accepted nutrition principles; when the user provides height, age, gender, bodyweight, activity level, and goal, give practical starting targets for calories, protein, carbs, and fat. "
                "If a diet-target question is missing key details, ask for the missing details in one short sentence. "
                "If the question is a general lifting or fitness question, answer directly from broadly accepted strength and hypertrophy principles, and only mention Gymmy data if it helps. "
                "Keep direct_answer to one or two plain sentences with no jargon. "
                "For estimated PR questions, include the estimate, the set it is based on, and a short precision warning if reps are high. "
                "When comparing exercises, give a practical recommendation and a short reason. "
                "Do not add extra coaching sections. Do not diagnose medical issues."
            ),
            input=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "input_text",
                            "text": json.dumps(summary, default=str),
                        }
                    ],
                }
            ],
            text={
                "format": {
                    "type": "json_schema",
                    "name": "gymmy_coaching_response",
                    "schema": COACH_RESPONSE_SCHEMA,
                    "strict": True,
                }
            },
        )
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail="Unable to generate coaching advice right now",
        ) from exc

    try:
        coaching = json.loads(response.output_text)
    except (AttributeError, json.JSONDecodeError) as exc:
        raise HTTPException(
            status_code=502,
            detail="OpenAI returned an unexpected coaching response",
        ) from exc

    coaching["model"] = model
    return coaching


@router.post("/", response_model=schemas.CoachOut)
def get_coaching_advice(
    request: schemas.CoachRequest | None = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    summary = build_coaching_summary(
        db=db,
        current_user=current_user,
        focus=request.focus if request else None,
        messages=request.messages if request else None,
    )
    coaching = generate_coaching_response(summary)

    return {
        "summary": summary,
        **coaching,
    }
