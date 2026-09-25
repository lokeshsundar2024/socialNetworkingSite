from datetime import datetime, timedelta, timezone

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core import security
from app.core.config import settings
from app.core.errors import AppError
from app.models.user import User
from app.repositories.session_repository import SessionRepository
from app.repositories.user_repository import UserRepository
from app.schemas.auth import RegisterRequest


class AuthService:
    def __init__(self, db: Session):
        self.db = db
        self.users = UserRepository(db)
        self.sessions = SessionRepository(db)

    def _issue_tokens(
        self, user: User, user_agent: str | None, ip: str | None
    ) -> tuple[str, str]:
        access = security.create_access_token(user.id)
        refresh = security.generate_refresh_token()
        self.sessions.create(
            user_id=user.id,
            token_hash=security.hash_token(refresh),
            expires_at=datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_days),
            user_agent=user_agent,
            ip_address=ip,
        )
        return access, refresh

    def register(
        self, data: RegisterRequest, user_agent: str | None, ip: str | None
    ) -> tuple[User, str, str]:
        if self.users.get_by_email(data.email):
            raise AppError(409, "Email already registered")
        if self.users.get_by_username(data.username):
            raise AppError(409, "Username already taken")
        try:
            user = self.users.create_with_defaults(
                email=data.email,
                username=data.username,
                password_hash=security.hash_password(data.password),
                display_name=data.display_name,
            )
            access, refresh = self._issue_tokens(user, user_agent, ip)
            self.db.commit()
        except IntegrityError:
            self.db.rollback()
            raise AppError(409, "Email or username already in use")
        return user, access, refresh

    def login(
        self, identifier: str, password: str, user_agent: str | None, ip: str | None
    ) -> tuple[User, str, str]:
        user = self.users.get_by_identifier(identifier)
        if user is None:
            security.burn_password_check(password)
            raise AppError(401, "Invalid credentials")
        if not security.verify_password(password, user.password_hash):
            raise AppError(401, "Invalid credentials")
        if not user.is_active or user.is_suspended:
            raise AppError(403, "This account is not active")
        access, refresh = self._issue_tokens(user, user_agent, ip)
        self.db.commit()
        return user, access, refresh

    def refresh(
        self, refresh_token: str, user_agent: str | None, ip: str | None
    ) -> tuple[User, str, str]:
        session = self.sessions.get_by_token_hash(security.hash_token(refresh_token))
        if session is None:
            raise AppError(401, "Invalid refresh token")
        if session.revoked_at is not None:
            # A revoked token was presented again: assume theft, kill every session.
            self.sessions.revoke_all_for_user(session.user_id)
            self.db.commit()
            raise AppError(401, "Invalid refresh token")
        if session.expires_at <= datetime.now(timezone.utc):
            raise AppError(401, "Refresh token expired")
        user = self.users.get_by_id(session.user_id)
        if user is None or not user.is_active or user.is_suspended:
            raise AppError(401, "Invalid refresh token")
        self.sessions.revoke(session)
        access, new_refresh = self._issue_tokens(user, user_agent, ip)
        self.db.commit()
        return user, access, new_refresh

    def logout(self, refresh_token: str) -> None:
        session = self.sessions.get_by_token_hash(security.hash_token(refresh_token))
        if session is not None and session.revoked_at is None:
            self.sessions.revoke(session)
            self.db.commit()