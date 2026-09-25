import uuid
from collections.abc import Sequence
from datetime import datetime

from sqlalchemy import select, tuple_
from sqlalchemy.orm import Session, joinedload, selectinload
from sqlalchemy.sql.elements import ColumnElement

from app.models.like import Like
from app.models.post import Post
from app.models.user import User


class LikedPostsRepository:
    def __init__(self, db: Session):
        self.db = db

    def list_for_user(
        self,
        user_id: uuid.UUID,
        *,
        limit: int,
        before: tuple[datetime, uuid.UUID] | None,
        clauses: Sequence[ColumnElement[bool]] = (),
    ) -> list[tuple[Post, datetime, uuid.UUID]]:
        """Posts a user liked, newest like first. Each row is (post, like time, like id)."""
        stmt = (
            select(Post, Like.created_at, Like.id)
            .join(Like, Like.post_id == Post.id)
            .where(Like.user_id == user_id, *clauses)
            .options(joinedload(Post.author).joinedload(User.profile), selectinload(Post.hashtags))
            .order_by(Like.created_at.desc(), Like.id.desc())
            .limit(limit + 1)
        )
        if before is not None:
            stmt = stmt.where(tuple_(Like.created_at, Like.id) < tuple_(before[0], before[1]))
        return [(post, created_at, like_id) for post, created_at, like_id in self.db.execute(stmt).all()]