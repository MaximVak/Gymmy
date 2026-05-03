from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import ProgressPhoto, User
from schemas import ProgressPhotoCreate, ProgressPhotoOut
from auth import get_current_user

router = APIRouter(
    prefix="/progress-photos",
    tags=["Progress Photos"]
)


@router.post("/", response_model=ProgressPhotoOut)
def create_progress_photo(
    photo: ProgressPhotoCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    new_photo = ProgressPhoto(
        photo_url=photo.photo_url,
        notes=photo.notes,
        user_id=current_user.id
    )

    db.add(new_photo)
    db.commit()
    db.refresh(new_photo)

    return new_photo


@router.get("/", response_model=list[ProgressPhotoOut])
def get_progress_photos(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    photos = (
        db.query(ProgressPhoto)
        .filter(ProgressPhoto.user_id == current_user.id)
        .order_by(ProgressPhoto.date.desc())
        .all()
    )

    return photos


@router.get("/{photo_id}", response_model=ProgressPhotoOut)
def get_progress_photo(
    photo_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    photo = (
        db.query(ProgressPhoto)
        .filter(
            ProgressPhoto.id == photo_id,
            ProgressPhoto.user_id == current_user.id
        )
        .first()
    )

    if not photo:
        raise HTTPException(status_code=404, detail="Progress photo not found")

    return photo


@router.delete("/{photo_id}")
def delete_progress_photo(
    photo_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    photo = (
        db.query(ProgressPhoto)
        .filter(
            ProgressPhoto.id == photo_id,
            ProgressPhoto.user_id == current_user.id
        )
        .first()
    )

    if not photo:
        raise HTTPException(status_code=404, detail="Progress photo not found")

    db.delete(photo)
    db.commit()

    return {"message": "Progress photo deleted successfully"}
