from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from database import Base


def utc_now():
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    created_at = Column(DateTime, default=utc_now)

    workouts = relationship(
        "Workout",
        back_populates="owner",
        cascade="all, delete-orphan",
    )
    templates = relationship(
        "Template",
        back_populates="owner",
        cascade="all, delete-orphan",
    )
    bodyweight_logs = relationship(
        "BodyweightLog",
        back_populates="owner",
        cascade="all, delete-orphan",
    )
    progress_photos = relationship(
        "ProgressPhoto",
        back_populates="owner",
        cascade="all, delete-orphan",
    )
    nutrition_entries = relationship(
        "NutritionEntry",
        back_populates="owner",
        cascade="all, delete-orphan",
    )
    nutrition_goal = relationship(
        "NutritionGoal",
        back_populates="owner",
        cascade="all, delete-orphan",
        uselist=False,
    )


class Workout(Base):
    __tablename__ = "workouts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, default="Workout")
    date = Column(DateTime, default=utc_now)
    notes = Column(Text, nullable=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))

    owner = relationship("User", back_populates="workouts")
    exercises = relationship(
        "Exercise",
        back_populates="workout",
        cascade="all, delete-orphan",
    )


class Exercise(Base):
    __tablename__ = "exercises"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    workout_id = Column(Integer, ForeignKey("workouts.id", ondelete="CASCADE"))

    workout = relationship("Workout", back_populates="exercises")
    sets = relationship(
        "WorkoutSet",
        back_populates="exercise",
        cascade="all, delete-orphan",
    )


class WorkoutSet(Base):
    __tablename__ = "workout_sets"

    id = Column(Integer, primary_key=True, index=True)
    reps = Column(Integer)
    weight = Column(Float)
    set_number = Column(Integer)
    exercise_id = Column(Integer, ForeignKey("exercises.id", ondelete="CASCADE"))

    exercise = relationship("Exercise", back_populates="sets")


class Template(Base):
    __tablename__ = "templates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))

    owner = relationship("User", back_populates="templates")
    exercises = relationship(
        "TemplateExercise",
        back_populates="template",
        cascade="all, delete-orphan",
        order_by="TemplateExercise.id",
    )


class TemplateExercise(Base):
    __tablename__ = "template_exercises"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    template_id = Column(Integer, ForeignKey("templates.id", ondelete="CASCADE"))

    template = relationship("Template", back_populates="exercises")
    sets = relationship(
        "TemplateSet",
        back_populates="template_exercise",
        cascade="all, delete-orphan",
        order_by="TemplateSet.set_number",
    )


class TemplateSet(Base):
    __tablename__ = "template_sets"

    id = Column(Integer, primary_key=True, index=True)
    reps = Column(Integer)
    weight = Column(Float)
    set_number = Column(Integer)
    template_exercise_id = Column(
        Integer,
        ForeignKey("template_exercises.id", ondelete="CASCADE"),
    )

    template_exercise = relationship("TemplateExercise", back_populates="sets")


class BodyweightLog(Base):
    __tablename__ = "bodyweight_logs"

    id = Column(Integer, primary_key=True, index=True)
    weight = Column(Float)
    date = Column(DateTime, default=utc_now)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))

    owner = relationship("User", back_populates="bodyweight_logs")


class ProgressPhoto(Base):
    __tablename__ = "progress_photos"

    id = Column(Integer, primary_key=True, index=True)
    photo_url = Column(String)
    date = Column(DateTime, default=utc_now)
    notes = Column(Text, nullable=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))

    owner = relationship("User", back_populates="progress_photos")


class NutritionEntry(Base):
    __tablename__ = "nutrition_entries"

    id = Column(Integer, primary_key=True, index=True)
    item_name = Column(String)
    calories = Column(Float)
    protein = Column(Float)
    carbs = Column(Float)
    fat = Column(Float)
    date = Column(DateTime, default=utc_now)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))

    owner = relationship("User", back_populates="nutrition_entries")


class NutritionGoal(Base):
    __tablename__ = "nutrition_goals"

    id = Column(Integer, primary_key=True, index=True)
    calories = Column(Float)
    protein = Column(Float)
    carbs = Column(Float)
    fat = Column(Float)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True)

    owner = relationship("User", back_populates="nutrition_goal")
