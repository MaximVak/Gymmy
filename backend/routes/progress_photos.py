from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
from models import ProgressPhoto, User
from schemas import ProgressPhotoCreate, ProgressPhotoOut

router = APIRouter(
    prefix="/progress-photos",
    tags=["Progress Photos"]
)

PROGRESS_PHOTO_UPLOAD_DIR = (
    Path(__file__).resolve().parents[1] / "uploads" / "progress_photos"
)

ALLOWED_IMAGE_TYPES = {
    "image/jpeg": {
        "default_extension": ".jpg",
        "extensions": {".jpg", ".jpeg"},
    },
    "image/png": {
        "default_extension": ".png",
        "extensions": {".png"},
    },
    "image/webp": {
        "default_extension": ".webp",
        "extensions": {".webp"},
    },
}


def get_file_extension(filename: str | None, content_type: str) -> str:
    configured_type = ALLOWED_IMAGE_TYPES[content_type]
    suffix = Path(filename or "").suffix.lower()

    if suffix in configured_type["extensions"]:
        return suffix

    return configured_type["default_extension"]


def has_allowed_image_signature(content: bytes, content_type: str) -> bool:
    if content_type == "image/jpeg":
        return content.startswith(b"\xff\xd8\xff")

    if content_type == "image/png":
        return content.startswith(b"\x89PNG\r\n\x1a\n")

    if content_type == "image/webp":
        return len(content) >= 12 and content[:4] == b"RIFF" and content[8:12] == b"WEBP"

    return False


def reject_invalid_image_upload(content: bytes, content_type: str | None):
    if content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Only JPEG, PNG, and WEBP uploads are supported",
        )

    if not content or not has_allowed_image_signature(content, content_type):
        raise HTTPException(
            status_code=400,
            detail="Uploaded file must be a valid JPEG, PNG, or WEBP image",
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


@router.post("/upload", response_model=ProgressPhotoOut)
async def upload_progress_photo(
    file: UploadFile = File(...),
    notes: str | None = Form(default=None, max_length=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    content = await file.read()
    reject_invalid_image_upload(content, file.content_type)

    PROGRESS_PHOTO_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    extension = get_file_extension(file.filename, file.content_type)
    filename = f"{uuid4().hex}{extension}"
    destination = PROGRESS_PHOTO_UPLOAD_DIR / filename
    destination.write_bytes(content)

    new_photo = ProgressPhoto(
        photo_url=f"/uploads/progress_photos/{filename}",
        notes=notes,
        user_id=current_user.id
    )

    try:
        db.add(new_photo)
        db.commit()
        db.refresh(new_photo)
    except Exception:
        destination.unlink(missing_ok=True)
        raise

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
