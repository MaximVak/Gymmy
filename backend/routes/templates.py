from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from typing import List
import models, schemas, auth

router = APIRouter(prefix="/templates", tags=["templates"])


def add_template_exercises(
    db: Session,
    template_id: int,
    exercises: List[schemas.TemplateExerciseCreate],
):
    for exercise in exercises:
        new_exercise = models.TemplateExercise(
            name=exercise.name,
            template_id=template_id
        )
        db.add(new_exercise)
        db.flush()

        for set_data in exercise.sets:
            new_set = models.TemplateSet(
                reps=set_data.reps,
                weight=set_data.weight,
                set_number=set_data.set_number,
                template_exercise_id=new_exercise.id,
            )
            db.add(new_set)


@router.post("/", response_model=schemas.TemplateOut)
def create_template(
    template: schemas.TemplateCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    new_template = models.Template(
        name=template.name,
        user_id=current_user.id
    )
    db.add(new_template)
    db.flush()

    add_template_exercises(db, new_template.id, template.exercises)

    db.commit()
    db.refresh(new_template)
    return new_template

@router.get("/", response_model=List[schemas.TemplateOut])
def get_templates(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    return db.query(models.Template).filter(
        models.Template.user_id == current_user.id
    ).all()

@router.get("/{template_id}", response_model=schemas.TemplateOut)
def get_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    template = db.query(models.Template).filter(
        models.Template.id == template_id,
        models.Template.user_id == current_user.id
    ).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template

@router.put("/{template_id}", response_model=schemas.TemplateOut)
def update_template(
    template_id: int,
    template: schemas.TemplateCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    db_template = db.query(models.Template).filter(
        models.Template.id == template_id,
        models.Template.user_id == current_user.id
    ).first()
    if not db_template:
        raise HTTPException(status_code=404, detail="Template not found")

    db_template.name = template.name
    for exercise in list(db_template.exercises):
        db.delete(exercise)
    db.flush()

    add_template_exercises(db, template_id, template.exercises)

    db.commit()
    db.refresh(db_template)
    return db_template

@router.delete("/{template_id}")
def delete_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    template = db.query(models.Template).filter(
        models.Template.id == template_id,
        models.Template.user_id == current_user.id
    ).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    db.delete(template)
    db.commit()
    return {"message": "Template deleted"}
