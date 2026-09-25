import uuid
from datetime import datetime

from sqlalchemy import Select, func, select, tuple_
from sqlalchemy.orm import Session, joinedload

from app.models.comment import Comment
from app.models.user import User


def _with_author():
    return (joinedload(Comment.author).joinedload(User.profile),)


class CommentRepository:
    def __init__(self, db: Session):
        self.db = db

    def get(self, comment_id: uuid.UUID) -> Comment | None:
        return self.db.scalar(
            select(Comment).options(*_with_author()).where(Comment.id == comment_id)
        )

    def create(
        self, *, post_id: uuid.UUID, author_id: uuid.UUID, parent_id: uuid.UUID | None, content: str
    ) -> Comment:
        comment = Comment(
            post_id=post_id, author_id=author_id, parent_id=parent_id, content=content
        )
        self.db.add(comment)
        self.db.flush()
        return comment

    def delete(self, comment: Comment) -> None:
        self.db.delete(comment)  # replies go with it via ON DELETE CASCADE
        self.db.flush()

    def _page(
        self, stmt: Select, limit: int, after: tuple[datetime, uuid.UUID] | None
    ) -> list[Comment]:
        stmt = (
            stmt.options(*_with_author())
            .order_by(Comment.created_at.asc(), Comment.id.asc())
            .limit(limit + 1)
        )
        if after is not None:
            stmt = stmt.where(tuple_(Comment.created_at, Comment.id) > tuple_(after[0], after[1]))
        return list(self.db.scalars(stmt).unique())

    def list_for_post(
        self, post_id: uuid.UUID, *, limit: int, after: tuple[datetime, uuid.UUID] | None
    ) -> list[Comment]:
        stmt = select(Comment).where(Comment.post_id == post_id, Comment.parent_id.is_(None))
        return self._page(stmt, limit, after)

    def list_replies(
        self, parent_id: uuid.UUID, *, limit: int, after: tuple[datetime, uuid.UUID] | None
    ) -> list[Comment]:
        return self._page(select(Comment).where(Comment.parent_id == parent_id), limit, after)

    def reply_counts_for(self, comment_ids: list[uuid.UUID]) -> dict[uuid.UUID, int]:
        if not comment_ids:
            return {}
        rows = self.db.execute(
            select(Comment.parent_id, func.count())
            .where(Comment.parent_id.in_(comment_ids))
            .group_by(Comment.parent_id)
        )
        return {parent_id: n for parent_id, n in rows}

    def counts_for_posts(self, post_ids: list[uuid.UUID]) -> dict[uuid.UUID, int]:
        if not post_ids:
            return {}
        rows = self.db.execute(
            select(Comment.post_id, func.count())
            .where(Comment.post_id.in_(post_ids))
            .group_by(Comment.post_id)
        )
        return {post_id: n for post_id, n in rows}