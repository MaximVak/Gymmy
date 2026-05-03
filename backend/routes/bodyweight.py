from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from typing import List
import models, schemas, auth
import datetime

router = APIRouter(prefix="/bodyweight", tags=["bodyweight"])

@router.post("/", response_model=schemas.BodyweightOut)
def log_bodyweight(
    log: schemas.BodyweightCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    new_log = models.BodyweightLog(
        weight=log.weight,
        date=log.date or datetime.datetime.utcnow(),
        user_id=current_user.id
    )
    db.add(new_log)
    db.commit()
    db.refresh(new_log)
    return new_log

@router.get("/", response_model=List[schemas.BodyweightOut])
def get_bodyweight_logs(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    return db.query(models.BodyweightLog).filter(
        models.BodyweightLog.user_id == current_user.id
    ).order_by(models.BodyweightLog.date.asc()).all()

@router.delete("/{log_id}")
def delete_log(
    log_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    log = db.query(models.BodyweightLog).filter(
        models.BodyweightLog.id == log_id,
        models.BodyweightLog.user_id == current_user.id
    ).first()
    if not log:
        raise HTTPException(status_code=404, detail="Log not found")
    db.delete(log)
    db.commit()
    return {"message": "Log deleted"}