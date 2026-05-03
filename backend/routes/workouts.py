from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import auth
import models
import schemas
from database import get_db

router = APIRouter(prefix="/workouts", tags=["workouts"])


def calculate_1rm(weight: float, reps: int) -> float:
    """Epley formula: 1RM = weight x (1 + reps / 30)."""
    if reps == 1:
        return weight
    return round(weight * (1 + reps / 30), 1)


@router.post("/", response_model=schemas.WorkoutOut)
def create_workout(
    workout: schemas.WorkoutCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    new_workout = models.Workout(
        name=workout.name,
        notes=workout.notes,
        user_id=current_user.id,
    )
    db.add(new_workout)
    db.flush()

    for exercise_data in workout.exercises:
        new_exercise = models.Exercise(
            name=exercise_data.name,
            workout_id=new_workout.id,
        )
        db.add(new_exercise)
        db.flush()

        for set_data in exercise_data.sets:
            new_set = models.WorkoutSet(
                reps=set_data.reps,
                weight=set_data.weight,
                set_number=set_data.set_number,
                exercise_id=new_exercise.id,
            )
            db.add(new_set)

    db.commit()
    db.refresh(new_workout)
    return new_workout


@router.get("/", response_model=List[schemas.WorkoutOut])
def get_workouts(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    return (
        db.query(models.Workout)
        .filter(models.Workout.user_id == current_user.id)
        .order_by(models.Workout.date.desc())
        .all()
    )


@router.get("/prs/{exercise_name}")
def get_pr_estimate(
    exercise_name: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    sets = (
        db.query(models.WorkoutSet, models.Exercise, models.Workout)
        .join(models.Exercise, models.WorkoutSet.exercise_id == models.Exercise.id)
        .join(models.Workout, models.Exercise.workout_id == models.Workout.id)
        .filter(models.Workout.user_id == current_user.id)
        .filter(models.Exercise.name.ilike(exercise_name))
        .all()
    )

    if not sets:
        raise HTTPException(status_code=404, detail="No sets found for this exercise")

    best = None

    for workout_set, exercise, workout in sets:
        estimated_1rm = calculate_1rm(workout_set.weight, workout_set.reps)

        if best is None or estimated_1rm > best["estimated_1rm"]:
            best = {
                "exercise": exercise.name,
                "weight": workout_set.weight,
                "reps": workout_set.reps,
                "set_number": workout_set.set_number,
                "estimated_1rm": estimated_1rm,
                "workout_id": workout.id,
                "workout_name": workout.name,
                "date": workout.date,
            }

    return best


@router.get("/{workout_id}", response_model=schemas.WorkoutOut)
def get_workout(
    workout_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    workout = (
        db.query(models.Workout)
        .filter(
            models.Workout.id == workout_id,
            models.Workout.user_id == current_user.id,
        )
        .first()
    )

    if not workout:
        raise HTTPException(status_code=404, detail="Workout not found")

    return workout


@router.delete("/{workout_id}")
def delete_workout(
    workout_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    workout = (
        db.query(models.Workout)
        .filter(
            models.Workout.id == workout_id,
            models.Workout.user_id == current_user.id,
        )
        .first()
    )

    if not workout:
        raise HTTPException(status_code=404, detail="Workout not found")

    db.delete(workout)
    db.commit()

    return {"message": "Workout deleted"}