import uuid
from collections.abc import Sequence
from datetime import datetime

from sqlalchemy import delete, select, tuple_
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session, joinedload, selectinload
from sqlalchemy.sql.elements import ColumnElement

from app.models.bookmark import Bookmark
from app.models.post import Post
from app.models.user import User


class BookmarkRepository:
    def __init__(self, db: Session):
        self.db = db

    def add(self, user_id: uuid.UUID, post_id: uuid.UUID) -> None:
        # The unique constraint plus DO NOTHING makes repeated bookmarks harmless
        self.db.execute(
            pg_insert(Bookmark)
            .values(id=uuid.uuid4(), user_id=user_id, post_id=post_id)
            .on_conflict_do_nothing(constraint="uq_bookmarks_user_post")
        )

    def remove(self, user_id: uuid.UUID, post_id: uuid.UUID) -> None:
        self.db.execute(
            delete(Bookmark).where(Bookmark.user_id == user_id, Bookmark.post_id == post_id)
        )

    def bookmarked_ids(self, user_id: uuid.UUID, post_ids: list[uuid.UUID]) -> set[uuid.UUID]:
        if not post_ids:
            return set()
        return set(
            self.db.scalars(
                select(Bookmark.post_id).where(
                    Bookmark.user_id == user_id, Bookmark.post_id.in_(post_ids)
                )
            )
        )

    def list_for_user(
        self,
        user_id: uuid.UUID,
        *,
        limit: int,
        before: tuple[datetime, uuid.UUID] | None,
        clauses: Sequence[ColumnElement[bool]] = (),
    ) -> list[tuple[Post, datetime, uuid.UUID]]:
        """Bookmarked posts, newest bookmark first. Each row is (post, bookmark time, bookmark id)."""
        stmt = (
            select(Post, Bookmark.created_at, Bookmark.id)
            .join(Bookmark, Bookmark.post_id == Post.id)
            .where(Bookmark.user_id == user_id, *clauses)
            .options(joinedload(Post.author).joinedload(User.profile), selectinload(Post.hashtags))
            .order_by(Bookmark.created_at.desc(), Bookmark.id.desc())
            .limit(limit + 1)
        )
        if before is not None:
            stmt = stmt.where(tuple_(Bookmark.created_at, Bookmark.id) < tuple_(before[0], before[1]))
        return [(post, created_at, bookmark_id) for post, created_at, bookmark_id in self.db.execute(stmt).all()]