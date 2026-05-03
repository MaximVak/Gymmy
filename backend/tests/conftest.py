import os
import sys
from pathlib import Path

import pytest

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

os.environ.setdefault("SECRET_KEY", "test-secret-key")
os.environ.setdefault("DATABASE_URL", "sqlite:///./test_gymmy.db")
os.environ.setdefault("ACCESS_TOKEN_EXPIRE_MINUTES", "10080")

import models
from database import engine


@pytest.fixture(autouse=True)
def reset_test_database():
    models.Base.metadata.drop_all(bind=engine)
    models.Base.metadata.create_all(bind=engine)
    yield