import uuid

from sqlalchemy import delete, func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from app.models.like import Like


class LikeRepository:
    def __init__(self, db: Session):
        self.db = db

    def counts_for(self, post_ids: list[uuid.UUID]) -> dict[uuid.UUID, int]:
        if not post_ids:
            return {}
        rows = self.db.execute(
            select(Like.post_id, func.count())
            .where(Like.post_id.in_(post_ids))
            .group_by(Like.post_id)
        )
        return {post_id: n for post_id, n in rows}

    def liked_ids(self, user_id: uuid.UUID, post_ids: list[uuid.UUID]) -> set[uuid.UUID]:
        if not post_ids:
            return set()
        return set(
            self.db.scalars(
                select(Like.post_id).where(Like.user_id == user_id, Like.post_id.in_(post_ids))
            )
        )

    def add(self, user_id: uuid.UUID, post_id: uuid.UUID) -> None:
        # The unique constraint plus DO NOTHING makes repeated likes harmless
        self.db.execute(
            pg_insert(Like)
            .values(id=uuid.uuid4(), user_id=user_id, post_id=post_id)
            .on_conflict_do_nothing(constraint="uq_likes_user_post")
        )

    def remove(self, user_id: uuid.UUID, post_id: uuid.UUID) -> None:
        self.db.execute(delete(Like).where(Like.user_id == user_id, Like.post_id == post_id))

    def count(self, post_id: uuid.UUID) -> int:
        return self.db.scalar(select(func.count()).select_from(Like).where(Like.post_id == post_id)) or 0