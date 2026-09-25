import uuid
from datetime import datetime

from sqlalchemy import delete, select, tuple_, update
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session, joinedload

from app.models.follow import Follow, FollowStatus
from app.models.user import User


class FollowRepository:
    def __init__(self, db: Session):
        self.db = db

    def get(self, follower_id: uuid.UUID, followee_id: uuid.UUID) -> Follow | None:
        return self.db.scalar(
            select(Follow).where(Follow.follower_id == follower_id, Follow.followee_id == followee_id)
        )

    def create(
        self, follower_id: uuid.UUID, followee_id: uuid.UUID, status: FollowStatus
    ) -> Follow:
        # The unique constraint plus DO NOTHING makes repeated follows harmless
        self.db.execute(
            pg_insert(Follow)
            .values(id=uuid.uuid4(), follower_id=follower_id, followee_id=followee_id, status=status)
            .on_conflict_do_nothing(constraint="uq_follows_pair")
        )
        follow = self.get(follower_id, followee_id)
        if follow is None:
            raise RuntimeError("Follow row missing after insert")
        return follow

    def delete(
        self, follower_id: uuid.UUID, followee_id: uuid.UUID, status: FollowStatus | None = None
    ) -> int:
        stmt = delete(Follow).where(
            Follow.follower_id == follower_id, Follow.followee_id == followee_id
        )
        if status is not None:
            stmt = stmt.where(Follow.status == status)
        return self.db.execute(stmt).rowcount

    def accept(self, follower_id: uuid.UUID, followee_id: uuid.UUID) -> int:
        return self.db.execute(
            update(Follow)
            .where(
                Follow.follower_id == follower_id,
                Follow.followee_id == followee_id,
                Follow.status == FollowStatus.PENDING,
            )
            .values(status=FollowStatus.ACCEPTED)
        ).rowcount

    def accept_all_pending(self, followee_id: uuid.UUID) -> int:
        return self.db.execute(
            update(Follow)
            .where(Follow.followee_id == followee_id, Follow.status == FollowStatus.PENDING)
            .values(status=FollowStatus.ACCEPTED)
        ).rowcount

    def list_pending(
        self, followee_id: uuid.UUID, *, limit: int, before: tuple[datetime, uuid.UUID] | None
    ) -> list[tuple[Follow, User]]:
        stmt = (
            select(Follow, User)
            .join(User, User.id == Follow.follower_id)
            .where(Follow.followee_id == followee_id, Follow.status == FollowStatus.PENDING)
            .options(joinedload(User.profile))
            .order_by(Follow.created_at.desc(), Follow.id.desc())
            .limit(limit + 1)
        )
        if before is not None:
            stmt = stmt.where(tuple_(Follow.created_at, Follow.id) < tuple_(before[0], before[1]))
        return [(follow, user) for follow, user in self.db.execute(stmt).all()]