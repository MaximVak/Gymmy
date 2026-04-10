from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List

# User schemas
class UserCreate(BaseModel):
    username: str
    email: str
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class UserOut(BaseModel):
    id: int
    username: str
    email: str
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

# Set schemas
class SetCreate(BaseModel):
    reps: int
    weight: float
    set_number: int

class SetOut(SetCreate):
    id: int
    class Config:
        from_attributes = True

# Exercise schemas
class ExerciseCreate(BaseModel):
    name: str
    sets: List[SetCreate] = []

class ExerciseOut(BaseModel):
    id: int
    name: str
    sets: List[SetOut] = []
    class Config:
        from_attributes = True

# Workout schemas
class WorkoutCreate(BaseModel):
    name: Optional[str] = "Workout"
    notes: Optional[str] = None
    exercises: List[ExerciseCreate] = []

class WorkoutOut(BaseModel):
    id: int
    name: str
    date: datetime
    notes: Optional[str]
    exercises: List[ExerciseOut] = []
    class Config:
        from_attributes = True

# Template schemas
class TemplateExerciseCreate(BaseModel):
    name: str

class TemplateExerciseOut(BaseModel):
    id: int
    name: str
    class Config:
        from_attributes = True

class TemplateCreate(BaseModel):
    name: str
    exercises: List[TemplateExerciseCreate] = []

class TemplateOut(BaseModel):
    id: int
    name: str
    exercises: List[TemplateExerciseOut] = []
    class Config:
        from_attributes = True

# Bodyweight schemas
class BodyweightCreate(BaseModel):
    weight: float
    date: Optional[datetime] = None

class BodyweightOut(BaseModel):
    id: int
    weight: float
    date: datetime
    class Config:
        from_attributes = True

# Progress photo schemas
class ProgressPhotoOut(BaseModel):
    id: int
    photo_url: str
    date: datetime
    notes: Optional[str]
    class Config:
        from_attributes = True