from fastapi import FastAPI

import models
from database import engine
from routes import bodyweight, progress_photos, templates, users, workouts

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Gymmy API")


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