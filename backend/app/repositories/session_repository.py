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