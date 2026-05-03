from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine
import models
from routes import users, workouts, templates, bodyweight, progress_photos

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Gymmy API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router, prefix="/users", tags=["users"])
app.include_router(workouts.router, prefix="/workouts", tags=["workouts"])
app.include_router(templates.router, prefix="/templates", tags=["templates"])
app.include_router(bodyweight.router, prefix="/bodyweight", tags=["bodyweight"])
app.include_router(progress_photos.router)

@app.get("/")
def root():
    return {"message": "Welcome to Gymmy API!"}