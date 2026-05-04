# Gymmy

Gymmy is a full-stack fitness tracking app for logging workouts, tracking bodyweight, storing progress photos, estimating PRs, and preparing for AI-assisted coaching recommendations.

The backend MVP is built with FastAPI, SQLAlchemy, SQLite, Pydantic, JWT authentication, and pytest. The React frontend is planned next.

## Current Backend Features

- User signup, login, and JWT-protected user profile
- Password hashing with bcrypt
- Workout logging with exercises and sets
- Workout history and workout detail endpoints
- Estimated one-rep max lookup by exercise
- Reusable workout templates
- Bodyweight tracking
- Progress photo tracking with URL-only entries
- Real progress photo uploads for JPEG, PNG, and WEBP files
- Uploaded image serving from `/uploads`
- Cascade deletes for user-owned records
- Pydantic validation for API payloads
- Basic API test coverage

## Tech Stack

### Backend

- FastAPI
- SQLAlchemy
- SQLite
- Pydantic
- JWT authentication
- bcrypt password hashing
- pytest

### Frontend

- React
- Vite
- JavaScript
- CSS

The frontend folder is currently reserved for the upcoming React MVP.

## Project Structure

```text
Gymmy/
  backend/
    main.py
    database.py
    models.py
    schemas.py
    auth.py
    requirements.txt
    .env.example
    routes/
      users.py
      workouts.py
      templates.py
      bodyweight.py
      progress_photos.py
    tests/
      conftest.py
      test_auth.py
      test_health.py
      test_other_routes.py
      test_workouts.py
    uploads/
      progress_photos/
  frontend/
  README.md
```

`backend/uploads/`, local databases, virtual environments, and `.env` files are intentionally ignored by Git.

## Backend Setup

From the repo root, move into the backend folder:

```bash
cd backend
```

Create a virtual environment:

```bash
python -m venv venv
```

Activate the virtual environment.

Windows PowerShell:

```powershell
venv\Scripts\Activate.ps1
```

If PowerShell blocks activation, allow scripts for the current shell session:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
venv\Scripts\Activate.ps1
```

Mac/Linux:

```bash
source venv/bin/activate
```

Install backend dependencies:

```bash
pip install -r requirements.txt
```

Create your local environment file:

```bash
cp .env.example .env
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Then update `.env` as needed:

```env
SECRET_KEY=change-me
DATABASE_URL=sqlite:///./gymmy.db
ACCESS_TOKEN_EXPIRE_MINUTES=10080
```

For local development, the default SQLite database is enough.

## Run The API

Start the FastAPI development server from the `backend/` folder:

```bash
uvicorn main:app --reload
```

The API will run at:

```text
http://127.0.0.1:8000
```

Open Swagger docs:

```text
http://127.0.0.1:8000/docs
```

Health check:

```text
GET /health
```

Expected response:

```json
{
  "status": "ok",
  "app": "Gymmy API"
}
```

## Run Tests

From the `backend/` folder:

```bash
pytest
```

If `pytest` is not on your PATH, run it through the virtual environment:

```powershell
venv\Scripts\python.exe -m pytest
```

Current backend result:

```text
17 passed
```

Tests use `sqlite:///./test_gymmy.db` and reset the database between tests.

## API Overview

### Auth And Users

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/signup` | Create a user account |
| `POST` | `/login` | Log in and receive a bearer token |
| `GET` | `/me` | Get the current authenticated user |

### Workouts

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/workouts/` | Create a workout with exercises and sets |
| `GET` | `/workouts/` | List the current user's workouts |
| `GET` | `/workouts/{workout_id}` | Get one workout |
| `DELETE` | `/workouts/{workout_id}` | Delete one workout |
| `GET` | `/workouts/prs/{exercise_name}` | Get the best estimated one-rep max for an exercise |

### Templates

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/templates/` | Create a reusable workout template |
| `GET` | `/templates/` | List templates |
| `GET` | `/templates/{template_id}` | Get one template |
| `PUT` | `/templates/{template_id}` | Update one template |
| `DELETE` | `/templates/{template_id}` | Delete one template |

### Bodyweight

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/bodyweight/` | Log bodyweight |
| `GET` | `/bodyweight/` | List bodyweight logs |
| `DELETE` | `/bodyweight/{log_id}` | Delete one bodyweight log |

### Progress Photos

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/progress-photos/` | Create a URL-only progress photo entry |
| `POST` | `/progress-photos/upload` | Upload a JPEG, PNG, or WEBP progress photo |
| `GET` | `/progress-photos/` | List progress photos |
| `GET` | `/progress-photos/{photo_id}` | Get one progress photo |
| `DELETE` | `/progress-photos/{photo_id}` | Delete one progress photo row |
| `GET` | `/uploads/progress_photos/{filename}` | Serve an uploaded progress photo |

Upload behavior:

- Accepts `multipart/form-data`
- Requires a `file` field
- Accepts optional `notes`
- Saves files under `backend/uploads/progress_photos/`
- Returns a `photo_url` such as `/uploads/progress_photos/example-file.jpg`
- Rejects non-image files and unsupported image types

## Status

Gymmy is currently in backend MVP development. The backend API is functional and tested. The next major step is building the React frontend so Gymmy can be used from the browser instead of Swagger.

## Roadmap

- Build React frontend
- Add dashboard page
- Add workout logging interface
- Add workout history and detail pages
- Add template management
- Add bodyweight progress charts
- Add progress photo timeline
- Add OpenAI-powered coaching assistant
- Add seed/demo data
- Add screenshots
- Add Docker support
- Add deployment notes
