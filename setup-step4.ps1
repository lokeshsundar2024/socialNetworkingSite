$ErrorActionPreference = "Stop"

Set-Location $PSScriptRoot

function Write-File([string]$RelPath, [string]$Content) {
  if ([string]::IsNullOrWhiteSpace($RelPath)) { throw "Write-File was called with an empty path" }
  $full = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot $RelPath))
  New-Item -ItemType Directory -Path (Split-Path $full -Parent) -Force | Out-Null
  [System.IO.File]::WriteAllText($full, $Content, (New-Object System.Text.UTF8Encoding($false)))
  Write-Host "wrote $RelPath"
}

# --- JWT secret in .env (generated once, never overwritten) ---
if (-not (Select-String -Path "backend\.env" -Pattern "^JWT_SECRET=" -Quiet)) {
  $bytes = New-Object byte[] 48
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  $secret = ($bytes | ForEach-Object { $_.ToString("x2") }) -join ""
  Add-Content -Path "backend\.env" -Value "`nJWT_SECRET=$secret"
}

Write-File "backend\app\core\config.py" @'
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Social Platform"
    database_url: str
    jwt_secret: str
    access_token_minutes: int = 15
    refresh_token_days: int = 14
    cookie_secure: bool = False  # set True in production (HTTPS)
    cors_origins: list[str] = ["http://localhost:3000"]


settings = Settings()
'@

Write-File "backend\app\core\errors.py" @'
class AppError(Exception):
    def __init__(self, status_code: int, detail: str):
        self.status_code = status_code
        self.detail = detail
        super().__init__(detail)
'@

Write-File "backend\app\core\security.py" @'
import hashlib
import secrets
import uuid
from datetime import datetime, timedelta, timezone

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerifyMismatchError

from app.core.config import settings

_ph = PasswordHasher()
_DUMMY_HASH = _ph.hash("dummy-password-for-timing")


def hash_password(password: str) -> str:
    return _ph.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return _ph.verify(password_hash, password)
    except (VerifyMismatchError, InvalidHashError):
        return False


def burn_password_check(password: str) -> None:
    """Spend the same time as a real check so unknown users are not detectable by timing."""
    verify_password(password, _DUMMY_HASH)


def create_access_token(user_id: uuid.UUID) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "type": "access",
        "iat": now,
        "exp": now + timedelta(minutes=settings.access_token_minutes),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def decode_access_token(token: str) -> uuid.UUID | None:
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
    except jwt.PyJWTError:
        return None
    if payload.get("type") != "access":
        return None
    try:
        return uuid.UUID(payload["sub"])
    except (KeyError, ValueError):
        return None


def generate_refresh_token() -> str:
    return secrets.token_urlsafe(48)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()
'@

Write-File "backend\app\schemas\auth.py" @'
import re
import uuid

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.models.user import UserRole

USERNAME_RE = re.compile(r"^[a-zA-Z0-9_]{3,30}$")


class RegisterRequest(BaseModel):
    email: EmailStr
    username: str
    display_name: str = Field(min_length=1, max_length=60)
    password: str = Field(min_length=8, max_length=128)

    @field_validator("username")
    @classmethod
    def valid_username(cls, v: str) -> str:
        if not USERNAME_RE.match(v):
            raise ValueError("Username must be 3-30 characters: letters, numbers, underscore")
        return v.lower()


class LoginRequest(BaseModel):
    identifier: str = Field(min_length=1, max_length=255)  # email or username
    password: str = Field(min_length=1, max_length=128)


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    username: str
    role: UserRole
    is_email_verified: bool


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
'@

Write-File "backend\app\repositories\user_repository.py" @'
import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.profile import Profile
from app.models.settings import PrivacySettings, UserSettings
from app.models.user import User


class UserRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, user_id: uuid.UUID) -> User | None:
        return self.db.get(User, user_id)

    def get_by_email(self, email: str) -> User | None:
        return self.db.scalar(select(User).where(User.email == email.lower()))

    def get_by_username(self, username: str) -> User | None:
        return self.db.scalar(select(User).where(User.username == username.lower()))

    def get_by_identifier(self, identifier: str) -> User | None:
        identifier = identifier.strip()
        if "@" in identifier:
            return self.get_by_email(identifier)
        return self.get_by_username(identifier)

    def create_with_defaults(
        self, *, email: str, username: str, password_hash: str, display_name: str
    ) -> User:
        user = User(email=email.lower(), username=username.lower(), password_hash=password_hash)
        user.profile = Profile(display_name=display_name)
        user.user_settings = UserSettings()
        user.privacy_settings = PrivacySettings()
        self.db.add(user)
        self.db.flush()
        return user
'@

Write-File "backend\app\repositories\session_repository.py" @'
import uuid
from datetime import datetime, timezone

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.models.session import UserSession


class SessionRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(
        self,
        *,
        user_id: uuid.UUID,
        token_hash: str,
        expires_at: datetime,
        user_agent: str | None,
        ip_address: str | None,
    ) -> UserSession:
        session = UserSession(
            user_id=user_id,
            refresh_token_hash=token_hash,
            expires_at=expires_at,
            user_agent=(user_agent or "")[:255] or None,
            ip_address=ip_address,
        )
        self.db.add(session)
        self.db.flush()
        return session

    def get_by_token_hash(self, token_hash: str) -> UserSession | None:
        return self.db.scalar(
            select(UserSession).where(UserSession.refresh_token_hash == token_hash)
        )

    def revoke(self, session: UserSession) -> None:
        session.revoked_at = datetime.now(timezone.utc)

    def revoke_all_for_user(self, user_id: uuid.UUID) -> None:
        self.db.execute(
            update(UserSession)
            .where(UserSession.user_id == user_id, UserSession.revoked_at.is_(None))
            .values(revoked_at=datetime.now(timezone.utc))
        )
'@

Write-File