$ErrorActionPreference = "Stop"

function Write-File($path, $content) {
  $full = Join-Path (Get-Location).Path $path
  [System.IO.File]::WriteAllText($full, $content, (New-Object System.Text.UTF8Encoding($false)))
}

Write-File "backend\app\models\base.py" @'
import uuid
from datetime import datetime

from sqlalchemy import DateTime, func
from sqlalchemy.orm import Mapped, mapped_column


class UUIDPrimaryKeyMixin:
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
'@

Write-File "backend\app\models\user.py" @'
import enum

from sqlalchemy import Boolean, Enum, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.base import TimestampMixin, UUIDPrimaryKeyMixin


class UserRole(str, enum.Enum):
    USER = "USER"
    MODERATOR = "MODERATOR"
    ADMIN = "ADMIN"


class User(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    username: Mapped[str] = mapped_column(String(30), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="user_role"),
        default=UserRole.USER,
        server_default="USER",
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    is_suspended: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    is_email_verified: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")

    profile: Mapped["Profile"] = relationship(
        back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    user_settings: Mapped["UserSettings"] = relationship(
        back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    privacy_settings: Mapped["PrivacySettings"] = relationship(
        back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    sessions: Mapped[list["UserSession"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
'@

Write-File "backend\app\models\profile.py" @'
import uuid

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.base import TimestampMixin, UUIDPrimaryKeyMixin


class Profile(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "profiles"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True
    )
    display_name: Mapped[str] = mapped_column(String(60))
    bio: Mapped[str | None] = mapped_column(Text, nullable=True)
    location: Mapped[str | None] = mapped_column(String(100), nullable=True)
    website: Mapped[str | None] = mapped_column(String(255), nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    cover_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    user: Mapped["User"] = relationship(back_populates="profile")
'@

Write-File "backend\app\models\session.py" @'
import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.base import TimestampMixin, UUIDPrimaryKeyMixin


class UserSession(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "sessions"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    refresh_token_hash: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(String(255), nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(64), nullable=True)

    user: Mapped["User"] = relationship(back_populates="sessions")
'@

Write-File "backend\app\models\settings.py" @'
import enum
import uuid

from sqlalchemy import Boolean, Enum, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.base import TimestampMixin, UUIDPrimaryKeyMixin


class Audience(str, enum.Enum):
    EVERYONE = "EVERYONE"
    FOLLOWERS = "FOLLOWERS"
    NOBODY = "NOBODY"


audience_type = Enum(Audience, name="audience")


class UserSettings(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "user_settings"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True
    )
    theme: Mapped[str] = mapped_column(String(10), default="system", server_default="system")
    email_notifications: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    push_notifications: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")

    user: Mapped["User"] = relationship(back_populates="user_settings")


class PrivacySettings(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "privacy_settings"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True
    )
    is_private: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    who_can_message: Mapped[Audience] = mapped_column(
        audience_type, default=Audience.EVERYONE, server_default="EVERYONE"
    )
    who_can_see_posts: Mapped[Audience] = mapped_column(
        audience_type, default=Audience.EVERYONE, server_default="EVERYONE"
    )
    who_can_see_profile: Mapped[Audience] = mapped_column(
        audience_type, default=Audience.EVERYONE, server_default="EVERYONE"
    )
    who_can_mention: Mapped[Audience] = mapped_column(
        audience_type, default=Audience.EVERYONE, server_default="EVERYONE"
    )
    who_can_comment: Mapped[Audience] = mapped_column(
        audience_type, default=Audience.EVERYONE, server_default="EVERYONE"
    )

    user: Mapped["User"] = relationship(back_populates="privacy_settings")
'@

Write-File "backend\app\models\__init__.py" @'
from app.models.profile import Profile
from app.models.session import UserSession
from app.models.settings import PrivacySettings, UserSettings
from app.models.user import User

__all__ = ["User", "Profile", "UserSession", "UserSettings", "PrivacySettings"]
'@

Write-File "backend\alembic\env.py" @'
from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

import app.models  # noqa: F401  (registers all models on Base.metadata)
from app.core.config import settings
from app.db.session import Base

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

config.set_main_option("sqlalchemy.url", settings.database_url)
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    context.configure(
        url=settings.database_url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
'@

Write-Host "Step 3 files written." -ForegroundColor Green