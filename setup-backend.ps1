$ErrorActionPreference = "Stop"

# Fix earlier misplacement (safe to run even if already correct)
if ((Test-Path "app") -and -not (Test-Path "backend\app")) { Move-Item "app" "backend\app" }
if (Test-Path "backend\.venv\.env") { Move-Item "backend\.venv\.env" "backend\.env" -Force }

# Folders
$dirs = @(
  "backend\app\api\v1", "backend\app\core", "backend\app\db",
  "backend\app\models", "backend\app\schemas",
  "backend\app\services", "backend\app\repositories",
  "frontend", "infra"
)
foreach ($d in $dirs) { New-Item -ItemType Directory -Path $d -Force | Out-Null }

# Helper: write UTF-8 without BOM (a BOM can break .env parsing)
function Write-File($path, $content) {
  $full = Join-Path (Get-Location).Path $path
  [System.IO.File]::WriteAllText($full, $content, (New-Object System.Text.UTF8Encoding($false)))
}

# Empty __init__.py files
$pkgs = @("app","app\api","app\api\v1","app\core","app\db","app\models","app\schemas","app\services","app\repositories")
foreach ($p in $pkgs) {
  $f = "backend\$p\__init__.py"
  if (-not (Test-Path $f)) { Write-File $f "" }
}

# .env (only if missing, so it never overwrites yours)
if (-not (Test-Path "backend\.env")) {
  Write-File "backend\.env" "DATABASE_URL=postgresql+psycopg://social:social_dev_pw@localhost:5432/social`n"
}

# Root .gitignore
Write-File ".gitignore" @'
.env
.venv/
__pycache__/
node_modules/
.next/
'@

Write-File "backend\app\core\config.py" @'
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Social Platform"
    database_url: str
    cors_origins: list[str] = ["http://localhost:3000"]


settings = Settings()
'@

Write-File "backend\app\db\session.py" @'
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import settings

engine = create_engine(settings.database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
'@

Write-File "backend\app\api\v1\health.py" @'
from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.db.session import get_db

router = APIRouter(tags=["health"])


@router.get("/health")
def health(db: Session = Depends(get_db)):
    db.execute(text("SELECT 1"))
    return {"status": "ok", "database": "up"}
'@

Write-File "backend\app\main.py" @'
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import health
from app.core.config import settings

app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api/v1")
'@

Write-Host "Done. Structure created." -ForegroundColor Green