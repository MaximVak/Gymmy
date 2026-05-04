from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

import models
from database import engine
from routes import bodyweight, progress_photos, templates, users, workouts

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Gymmy API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = Path(__file__).resolve().parent / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


@app.get("/")
def root():
    return {"message": "Welcome to Gymmy API"}


@app.get("/health")
def health_check():
    return {"status": "ok", "app": "Gymmy API"}


app.include_router(users.router)
app.include_router(workouts.router)
app.include_router(templates.router)
app.include_router(bodyweight.router)
app.include_router(progress_photos.router)
