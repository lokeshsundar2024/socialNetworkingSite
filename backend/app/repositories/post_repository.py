import uuid
from collections.abc import Sequence
from datetime import datetime, timezone

from sqlalchemy import select, tuple_
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session, joinedload, selectinload
from sqlalchemy.sql.elements import ColumnElement

from app.models.post import Hashtag, Post
from app.models.user import User


def _load_options():
    return (
        joinedload(Post.author).joinedload(User.profile),
        selectinload(Post.hashtags),
    )


class PostRepository:
    def __init__(self, db: Session):
        self.db = db

    def _hashtags(self, names: list[str]) -> list[Hashtag]:
        if not names:
            return []
        # ON CONFLICT DO NOTHING makes this safe when two requests create the same tag at once
        self.db.execute(
            pg_insert(Hashtag)
            .values([{"id": uuid.uuid4(), "tag": n} for n in names])
            .on_conflict_do_nothing(index_elements=["tag"])
        )
        return list(self.db.scalars(select(Hashtag).where(Hashtag.tag.in_(names))))

    def create(self, *, author_id: uuid.UUID, content: str, tags: list[str]) -> Post:
        post = Post(author_id=author_id, content=content)
        post.hashtags = self._hashtags(tags)
        self.db.add(post)
        self.db.flush()
        return post

    def get(self, post_id: uuid.UUID) -> Post | None:
        return self.db.scalar(select(Post).options(*_load_options()).where(Post.id == post_id))

    def update(self, post: Post, content: str, tags: list[str]) -> None:
        post.content = content
        post.hashtags = self._hashtags(tags)
        post.edited_at = datetime.now(timezone.utc)
        self.db.flush()

    def delete(self, post: Post) -> None:
        self.db.delete(post)
        self.db.flush()

    def list_feed(
        self,
        *,
        limit: int,
        before: tuple[datetime, uuid.UUID] | None,
        clauses: Sequence[ColumnElement[bool]],
    ) -> list[Post]:
        stmt = (
            select(Post)
            .options(*_load_options())
            .where(*clauses)
            .order_by(Post.created_at.desc(), Post.id.desc())
            .limit(limit + 1)
        )
        if before is not None:
            stmt = stmt.where(tuple_(Post.created_at, Post.id) < tuple_(before[0], before[1]))
        return list(self.db.scalars(stmt).unique())