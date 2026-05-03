# Gymmy

Gymmy is a full-stack fitness tracking app built with React, FastAPI, SQLAlchemy, and SQLite. It allows users to log workouts, track bodyweight, create reusable workout templates, estimate PRs, and eventually receive AI-powered training guidance based on their workout history.

## Features

- User registration and login
- JWT authentication
- Password hashing with bcrypt
- Workout logging
- Exercise and set tracking
- Estimated one-rep max calculation
- Reusable workout templates
- Bodyweight tracking
- Progress photo tracking
- Planned OpenAI-powered coaching assistant

## Tech Stack

### Backend

- FastAPI
- SQLAlchemy
- SQLite
- Pydantic
- JWT authentication
- bcrypt password hashing

### Frontend

- React
- Vite
- JavaScript
- CSS

The frontend is planned and will be built after the backend MVP is completed.

## Project Structure

```text
Gymmy/
  backend/
    main.py
    database.py
    models.py
    schemas.py
    auth.py
    routes/
      users.py
      workouts.py
      templates.py
      bodyweight.py
      progress_photos.py
    requirements.txt
  frontend/
  README.md
```

## Backend Setup

Navigate to the backend folder:

```bash
cd backend
```

Create a virtual environment:

```bash
python -m venv venv
```

Activate the virtual environment.

Windows PowerShell:

```bash
venv\Scripts\Activate.ps1
```

If PowerShell blocks activation, run:

```bash
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
venv\Scripts\Activate.ps1
```

Mac/Linux:

```bash
source venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Run the FastAPI server:

```bash
uvicorn main:app --reload
```

Open the API docs in your browser:

```text
http://127.0.0.1:8000/docs
```

## API Overview

The backend currently includes routes for:

- Users
- Authentication
- Workouts
- Workout templates
- Bodyweight logs
- Progress photos

FastAPI automatically generates interactive API documentation at:

```text
http://127.0.0.1:8000/docs
```

## Status

Gymmy is currently in backend MVP development. The backend API is functional, and the next major step is building the React frontend.

## Roadmap

- Build React frontend
- Add dashboard page
- Add workout logging interface
- Add workout history page
- Add template creation and usage
- Add bodyweight progress charts
- Add progress photo upload support
- Add OpenAI-powered coaching assistant
- Add tests
- Add Docker support
