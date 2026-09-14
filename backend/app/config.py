"""
Configuration and Singleton Providers for Aegis.

Design Pattern: SINGLETON PATTERN
Justification:
1. DatabaseSingleton: Ensures a single SQLite connection engine and session factory
   is instantiated and reused across requests. This prevents database file locking issues,
   connection leaks, and memory bloat in FastAPI.
2. BedrockConfigSingleton: Centralizes Amazon Bedrock credentials and model instantiation.
   Reusing the Bedrock client connection avoids repeated TLS handshakes, manages API rate
   limits, and cleanly provides a graceful fallback mode when AWS credentials are absent.
"""

import os
from pathlib import Path
from typing import Optional
from pydantic_settings import BaseSettings
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

# Use explicit path so uvicorn's WatchFiles reloader child process
# always finds the .env regardless of its working directory.
_env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=_env_path, override=True)

class Settings(BaseSettings):
    PROJECT_NAME: str = "Aegis — Autonomous Purchase Guardian Agent"
    API_PREFIX: str = "/api"
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./aegis_guardian.db")
    
    # AWS Bedrock Settings
    AWS_REGION: str = os.getenv("AWS_REGION", "us-east-1")
    AWS_ACCESS_KEY_ID: Optional[str] = os.getenv("AWS_ACCESS_KEY_ID", None)
    AWS_SECRET_ACCESS_KEY: Optional[str] = os.getenv("AWS_SECRET_ACCESS_KEY", None)
    BEDROCK_MODEL_ID: str = os.getenv("BEDROCK_MODEL_ID", "anthropic.claude-3-haiku-20240307-v1:0")
    
    # Guardian Triage Thresholds
    RETURN_WINDOW_WARNING_DAYS: int = 5   # Alert when <= 5 days left in return window
    WARRANTY_WARNING_DAYS: int = 14       # Alert when <= 14 days left in warranty
    POLL_INTERVAL_SECONDS: int = 30       # Alerts polling interval

    # External APIs
    CPSC_API_BASE_URL: str = "https://www.saferproducts.gov/RestWebServices/Recall"

    model_config = {"env_file": ".env", "extra": "ignore"}

settings = Settings()

Base = declarative_base()


class DatabaseSingleton:
    """
    Singleton Pattern: Manages the SQLAlchemy Engine and Sessionmaker.
    Guarantees thread-safe shared SQLite access with foreign keys enabled.
    """
    _instance = None
    _engine = None
    _sessionmaker = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(DatabaseSingleton, cls).__new__(cls)
            connect_args = {"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {}
            cls._engine = create_engine(settings.DATABASE_URL, connect_args=connect_args, echo=False)
            cls._sessionmaker = sessionmaker(autocommit=False, autoflush=False, bind=cls._engine)
        return cls._instance

    @property
    def engine(self):
        return self._engine

    @property
    def sessionmaker(self):
        return self._sessionmaker

    def get_session(self):
        db = self._sessionmaker()
        try:
            yield db
        finally:
            db.close()


class BedrockConfigSingleton:
    """
    Singleton Pattern: Manages Bedrock client & Strands model instance.
    Checks if AWS Bedrock credentials exist and returns a unified status.
    """
    _instance = None
    _bedrock_model = None
    _is_live_bedrock: bool = False

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(BedrockConfigSingleton, cls).__new__(cls)
            cls._instance._initialize()
        return cls._instance

    def _initialize(self):
        has_aws = bool(
            (os.getenv("AWS_ACCESS_KEY_ID") and os.getenv("AWS_SECRET_ACCESS_KEY"))
            or os.getenv("AWS_PROFILE")
            or os.getenv("AWS_CONTAINER_CREDENTIALS_RELATIVE_URI")
        )
        if has_aws:
            try:
                from strands.models import BedrockModel
                self._bedrock_model = BedrockModel(
                    model_id=settings.BEDROCK_MODEL_ID,
                    region_name=settings.AWS_REGION
                )
                self._is_live_bedrock = True
            except Exception:
                self._bedrock_model = None
                self._is_live_bedrock = False
        else:
            self._bedrock_model = None
            self._is_live_bedrock = False

    @property
    def is_live_bedrock(self) -> bool:
        return self._is_live_bedrock

    @property
    def model(self):
        return self._bedrock_model

    @property
    def status_summary(self) -> dict:
        return {
            "is_live_bedrock": self._is_live_bedrock,
            "model_id": settings.BEDROCK_MODEL_ID if self._is_live_bedrock else "aegis-strands-heuristic-v1",
            "provider": "Amazon Bedrock (Claude Haiku)" if self._is_live_bedrock else "Strands Autonomous Fallback Mode",
            "region": settings.AWS_REGION
        }


# Global singleton accessors
db_singleton = DatabaseSingleton()
bedrock_singleton = BedrockConfigSingleton()
