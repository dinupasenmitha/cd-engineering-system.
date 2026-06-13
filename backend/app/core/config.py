import os
from pydantic_settings import BaseSettings, SettingsConfigDict

_INSECURE_DEFAULT_KEY = "replace-this-with-a-secure-random-string-in-production"

class Settings(BaseSettings):
    PROJECT_NAME: str = "CD Engineering ERP API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    SECRET_KEY: str = _INSECURE_DEFAULT_KEY
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 120
    
    MYSQL_USER: str = "root"
    MYSQL_PASSWORD: str = ""
    MYSQL_HOST: str = "localhost"
    MYSQL_PORT: str = "3306"
    MYSQL_DB: str = "cd_engineering"
    DATABASE_URL: str = ""
    
    UPLOAD_DIR: str = "data/uploads"
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if not self.DATABASE_URL:
            self.DATABASE_URL = f"mysql+pymysql://{self.MYSQL_USER}:{self.MYSQL_PASSWORD}@{self.MYSQL_HOST}:{self.MYSQL_PORT}/{self.MYSQL_DB}"

settings = Settings()

# Refuse to start with the insecure default secret key in production
if os.getenv("ENV", "").lower() == "production" and settings.SECRET_KEY == _INSECURE_DEFAULT_KEY:
    raise RuntimeError(
        "SECRET_KEY must be set to a secure random value in production. "
        "Generate one with: python -c \"import secrets; print(secrets.token_hex(32))\""
    )

# Ensure upload directory exists
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
