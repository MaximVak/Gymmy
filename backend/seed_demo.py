from datetime import timedelta

import auth
import models
from database import SessionLocal, engine
from models import utc_now


DEMO_USERNAME = "demo"
DEMO_EMAIL = "demo@gymmy.app"
DEMO_PASSWORD = "password123"


def create_workout(db, user, name, days_ago, notes, exercises):
    workout = models.Workout(
        name=name,
        date=utc_now() - timedelta(days=days_ago),
        notes=notes,
        user_id=user.id,
    )
    db.add(workout)
    db.flush()

    for exercise_name, sets in exercises:
        exercise = models.Exercise(name=exercise_name, workout_id=workout.id)
        db.add(exercise)
        db.flush()

        for set_number, reps, weight in sets:
            db.add(
                models.WorkoutSet(
                    set_number=set_number,
                    reps=reps,
                    weight=weight,
                    exercise_id=exercise.id,
                )
            )


def create_template(db, user, name, exercise_names):
    template = models.Template(name=name, user_id=user.id)
    db.add(template)
    db.flush()

    for exercise_name in exercise_names:
        db.add(
            models.TemplateExercise(
                name=exercise_name,
                template_id=template.id,
            )
        )


def seed_demo_data():
    models.Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        existing_user = (
            db.query(models.User)
            .filter(
                (models.User.username == DEMO_USERNAME)
                | (models.User.email == DEMO_EMAIL)
            )
            .first()
        )

        if existing_user:
            db.delete(existing_user)
            db.commit()

        user = models.User(
            username=DEMO_USERNAME,
            email=DEMO_EMAIL,
            hashed_password=auth.get_password_hash(DEMO_PASSWORD),
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        create_workout(
            db,
            user,
            "Push Strength",
            1,
            "Bench focus, strong top set.",
            [
                (
                    "Bench Press",
                    [
                        (1, 12, 150),
                        (2, 8, 165),
                        (3, 5, 185),
                    ],
                ),
                (
                    "Incline Dumbbell Press",
                    [
                        (1, 10, 65),
                        (2, 10, 65),
                        (3, 8, 70),
                    ],
                ),
                (
                    "Triceps Pushdown",
                    [
                        (1, 12, 70),
                        (2, 12, 70),
                    ],
                ),
            ],
        )
        create_workout(
            db,
            user,
            "Lower Body",
            3,
            "Squat volume and hinge work.",
            [
                (
                    "Back Squat",
                    [
                        (1, 8, 205),
                        (2, 6, 225),
                        (3, 5, 245),
                    ],
                ),
                (
                    "Romanian Deadlift",
                    [
                        (1, 10, 185),
                        (2, 10, 185),
                    ],
                ),
            ],
        )
        create_workout(
            db,
            user,
            "Upper Volume",
            6,
            "Chest and back volume.",
            [
                (
                    "Dumbbell Press",
                    [
                        (1, 12, 60),
                        (2, 10, 65),
                        (3, 9, 65),
                    ],
                ),
                (
                    "Lat Pulldown",
                    [
                        (1, 12, 130),
                        (2, 10, 140),
                        (3, 8, 150),
                    ],
                ),
            ],
        )

        for days_ago, weight in [
            (35, 184.5),
            (28, 183.8),
            (21, 183.0),
            (14, 182.4),
            (7, 181.8),
            (1, 181.2),
        ]:
            db.add(
                models.BodyweightLog(
                    weight=weight,
                    date=utc_now() - timedelta(days=days_ago),
                    user_id=user.id,
                )
            )

        create_template(
            db,
            user,
            "Push Day",
            ["Bench Press", "Incline Dumbbell Press", "Lateral Raise"],
        )
        create_template(
            db,
            user,
            "Lower Day",
            ["Back Squat", "Romanian Deadlift", "Leg Curl"],
        )

        db.add(
            models.ProgressPhoto(
                photo_url="https://placehold.co/900x1100?text=Progress+Photo",
                notes="Demo progress photo",
                user_id=user.id,
            )
        )

        db.commit()
    finally:
        db.close()

    print("Demo data seeded.")
    print(f"Username: {DEMO_USERNAME}")
    print(f"Password: {DEMO_PASSWORD}")


if __name__ == "__main__":
    seed_demo_data()
