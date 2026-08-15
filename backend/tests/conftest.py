import pytest
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[1]))

from app.api.auth import limiter

@pytest.fixture(autouse=True)
def reset_rate_limit():
    limiter._storage.reset()
