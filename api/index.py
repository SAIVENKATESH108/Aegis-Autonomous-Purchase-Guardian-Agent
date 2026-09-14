"""
Vercel Serverless Function entrypoint for Aegis FastAPI backend.
"""
import os
import sys

# Add backend directory to sys.path so app modules are resolved cleanly
current_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.abspath(os.path.join(current_dir, ".."))
backend_dir = os.path.join(root_dir, "backend")

if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

# On Vercel Lambda, /tmp is the only writable directory for SQLite
if os.getenv("VERCEL") or os.getenv("AWS_LAMBDA_FUNCTION_NAME"):
    os.environ.setdefault("DATABASE_URL", "sqlite:////tmp/aegis_guardian.db")

from app.main import app
