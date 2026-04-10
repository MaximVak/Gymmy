from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from typing import List
import models, schemas, auth

router = APIRouter()

def calculate_1rm(weight: float, reps: int) -> float:
    """Epley formula: 1RM = weight × (1 + reps/30)"""
    if reps == 1:
        return weight
    return round(weight * (1 + reps / 30), 1)

@router.post("/", response_model=schemas.WorkoutOut)
def create_workout(
    workout: schemas.WorkoutCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    new_workout = models.Workout(
        name=workout.name,
        notes=workout.notes,
        user_id=current_user.id
    )
    db.add(new_workout)
    db.flush()

    for exercise_data in workout.exercises:
        new_exercise = models.Exercise(
            name=exercise_data.name,
            workout_id=new_workout.id
        )
        db.add(new_exercise)
        db.flush()

        for set_data in exercise_data.sets:
            new_set = models.WorkoutSet(
                reps=set_data.reps,
                weight=set_data.weight,
                set_number=set_data.set_number,
                exercise_id=new_exercise.id
            )
            db.add(new_set)

    db.commit()
    db.refresh(new_workout)
    return new_workout

@router.get("/", response_model=List[schemas.WorkoutOut])
def get_workouts(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    return db.query(models.Workout).filter(
        models.Workout.user_id == current_user.id
    ).order_by(models.Workout.date.desc()).all()

@router.get("/{workout_id}", response_model=schemas.WorkoutOut)
def get_workout(
    workout_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    workout = db.query(models.Workout).filter(
        models.Workout.id == workout_id,
        models.Workout.user_id == current_user.id
    ).first()
    if not workout:
        raise HTTPException(status_code=404, detail="Workout not found")
    return workout

@router.delete("/{workout_id}")
def delete_workout(
    workout_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    workout = db.query(models.Workout).filter(
        models.Workout.id == workout_id,
        models.Workout.user_id == current_user.id
    ).first()
    if not workout:
        raise HTTPException(status_code=404, detail="Workout not found")
    db.delete(workout)
    db.commit()
    return {"message": "Workout deleted"}

@router.get("/{workout_id}/pr/{exercise_name}")
def get_pr(
    workout_id: int,
    exercise_name: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    exercise = db.query(models.Exercise).join(models.Workout).filter(
        models.Exercise.name == exercise_name,
        models.Workout.user_id == current_user.id
    ).first()
    if not exercise or not exercise.sets:
        raise HTTPException(status_code=404, detail="Exercise or sets not found")
    
    first_set = sorted(exercise.sets, key=lambda s: s.set_number)[0]
    estimated_1rm = calculate_1rm(first_set.weight, first_set.reps)
    
    return {
        "exercise": exercise_name,
        "weight": first_set.weight,
        "reps": first_set.reps,
        "estimated_1rm": estimated_1rm
    }