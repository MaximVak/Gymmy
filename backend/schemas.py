from datetime import datetime
from typing import Any, List, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


# User schemas
class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=30)
    email: EmailStr
    password: str = Field(..., min_length=8)


class UserLogin(BaseModel):
    username: str = Field(..., min_length=3, max_length=30)
    password: str = Field(..., min_length=8)


class UserOut(BaseModel):
    id: int
    username: str
    email: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    access_token: str
    token_type: str


# Set schemas
class SetCreate(BaseModel):
    reps: int = Field(..., ge=1, le=100)
    weight: float = Field(..., ge=0)
    set_number: int = Field(..., ge=1)


class SetOut(SetCreate):
    id: int

    model_config = ConfigDict(from_attributes=True)


# Exercise schemas
class ExerciseCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    sets: List[SetCreate] = []


class ExerciseOut(BaseModel):
    id: int
    name: str
    sets: List[SetOut] = []

    model_config = ConfigDict(from_attributes=True)


# Workout schemas
class WorkoutCreate(BaseModel):
    name: Optional[str] = Field(default="Workout", min_length=1, max_length=100)
    notes: Optional[str] = Field(default=None, max_length=1000)
    exercises: List[ExerciseCreate] = []


class WorkoutOut(BaseModel):
    id: int
    name: str
    date: datetime
    notes: Optional[str]
    exercises: List[ExerciseOut] = []

    model_config = ConfigDict(from_attributes=True)


# Template schemas
class TemplateExerciseCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)


class TemplateExerciseOut(BaseModel):
    id: int
    name: str

    model_config = ConfigDict(from_attributes=True)


class TemplateCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    exercises: List[TemplateExerciseCreate] = []


class TemplateOut(BaseModel):
    id: int
    name: str
    exercises: List[TemplateExerciseOut] = []

    model_config = ConfigDict(from_attributes=True)


# Bodyweight schemas
class BodyweightCreate(BaseModel):
    weight: float = Field(..., gt=0, le=1000)
    date: Optional[datetime] = None


class BodyweightOut(BaseModel):
    id: int
    weight: float
    date: datetime

    model_config = ConfigDict(from_attributes=True)


# Progress photo schemas
class ProgressPhotoCreate(BaseModel):
    photo_url: str = Field(..., min_length=1, max_length=1000)
    notes: Optional[str] = Field(default=None, max_length=1000)


class ProgressPhotoOut(BaseModel):
    id: int
    photo_url: str
    date: datetime
    notes: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# Coach schemas
class CoachRequest(BaseModel):
    focus: Optional[str] = Field(default=None, max_length=500)


class CoachOut(BaseModel):
    summary: dict[str, Any]
    direct_answer: str
    disclaimer: str
    model: str
