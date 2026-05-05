from datetime import date as date_type
from datetime import datetime, time, timedelta, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

import auth
import models
import schemas
from database import get_db

router = APIRouter(prefix="/nutrition", tags=["nutrition"])


def utc_now():
    return datetime.now(timezone.utc)


@router.get("/goals", response_model=Optional[schemas.NutritionGoalOut])
def get_nutrition_goal(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    return (
        db.query(models.NutritionGoal)
        .filter(models.NutritionGoal.user_id == current_user.id)
        .first()
    )


@router.put("/goals", response_model=schemas.NutritionGoalOut)
def upsert_nutrition_goal(
    goal: schemas.NutritionGoalCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    existing_goal = (
        db.query(models.NutritionGoal)
        .filter(models.NutritionGoal.user_id == current_user.id)
        .first()
    )

    if existing_goal:
        existing_goal.calories = goal.calories
        existing_goal.protein = goal.protein
        existing_goal.carbs = goal.carbs
        existing_goal.fat = goal.fat
        existing_goal.updated_at = utc_now()
        nutrition_goal = existing_goal
    else:
        nutrition_goal = models.NutritionGoal(
            calories=goal.calories,
            protein=goal.protein,
            carbs=goal.carbs,
            fat=goal.fat,
            user_id=current_user.id,
        )
        db.add(nutrition_goal)

    db.commit()
    db.refresh(nutrition_goal)
    return nutrition_goal


@router.post("/", response_model=schemas.NutritionEntryOut)
def create_nutrition_entry(
    entry: schemas.NutritionEntryCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    new_entry = models.NutritionEntry(
        item_name=entry.item_name,
        calories=entry.calories,
        protein=entry.protein,
        carbs=entry.carbs,
        fat=entry.fat,
        date=entry.date or utc_now(),
        user_id=current_user.id,
    )
    db.add(new_entry)
    db.commit()
    db.refresh(new_entry)
    return new_entry


@router.get("/", response_model=List[schemas.NutritionEntryOut])
def get_nutrition_entries(
    entry_date: date_type | None = Query(default=None, alias="date"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    query = db.query(models.NutritionEntry).filter(
        models.NutritionEntry.user_id == current_user.id
    )

    if entry_date:
        start = datetime.combine(entry_date, time.min, tzinfo=timezone.utc)
        end = start + timedelta(days=1)
        query = query.filter(
            models.NutritionEntry.date >= start,
            models.NutritionEntry.date < end,
        )

    return query.order_by(models.NutritionEntry.date.desc()).all()


@router.delete("/{entry_id}")
def delete_nutrition_entry(
    entry_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    entry = (
        db.query(models.NutritionEntry)
        .filter(
            models.NutritionEntry.id == entry_id,
            models.NutritionEntry.user_id == current_user.id,
        )
        .first()
    )

    if not entry:
        raise HTTPException(status_code=404, detail="Nutrition entry not found")

    db.delete(entry)
    db.commit()

    return {"message": "Nutrition entry deleted"}
