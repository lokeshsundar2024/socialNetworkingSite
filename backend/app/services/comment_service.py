import uuid

from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.models.comment import Comment
from app.models.post import Post
from app.models.user import User, UserRole
from app.repositories.comment_repository import CommentRepository
from app.repositories.visibility_repository import VisibilityRepository
from app.schemas.comment import CommentCreate, CommentOut, CommentPage
from app.schemas.post import AuthorOut
from app.services.post_service import decode_cursor, encode_cursor


def to_comment_out(comment: Comment, reply_count: int) -> CommentOut:
    author = comment.author
    profile = author.profile
    return CommentOut(
        id=comment.id,
        post_id=comment.post_id,
        parent_id=comment.parent_id,
        content=comment.content,
        created_at=comment.created_at,
        author=AuthorOut(
            id=author.id,
            username=author.username,
            display_name=profile.display_name if profile else author.username,
            avatar_url=profile.avatar_url if profile else None,
        ),
        reply_count=reply_count,
    )


class CommentService:
    def __init__(self, db: Session):
        self.db = db
        self.comments = CommentRepository(db)
        self.visibility = VisibilityRepository(db)

    def _to_out(self, rows: list[Comment]) -> list[CommentOut]:
        counts = self.comments.reply_counts_for([c.id for c in rows])
        return [to_comment_out(c, counts.get(c.id, 0)) for c in rows]

    def _page(self, rows: list[Comment], limit: int) -> CommentPage:
        has_more = len(rows) > limit
        rows = rows[:limit]
        return CommentPage(
            items=self._to_out(rows),
            next_cursor=encode_cursor(rows[-1]) if has_more else None,
        )

    def _require_post(self, post_id: uuid.UUID) -> Post:
        post = self.db.get(Post, post_id)
        if post is None:
            raise AppError(404, "Post not found")
        return post

    def _require_visible_post(self, viewer: User, post_id: uuid.UUID) -> Post:
        post = self._require_post(post_id)
        if not self.visibility.can_view(viewer, post.author_id):
            # 404, not 403, so nobody can tell that a private post exists
            raise AppError(404, "Post not found")
        return post

    def _require_comment(self, comment_id: uuid.UUID) -> Comment:
        comment = self.comments.get(comment_id)
        if comment is None:
            raise AppError(404, "Comment not found")
        return comment

    def list_for_post(
        self, viewer: User, post_id: uuid.UUID, limit: int, cursor: str | None
    ) -> CommentPage:
        self._require_visible_post(viewer, post_id)
        after = decode_cursor(cursor) if cursor else None
        return self._page(self.comments.list_for_post(post_id, limit=limit, after=after), limit)

    def list_replies(
        self, viewer: User, comment_id: uuid.UUID, limit: int, cursor: str | None
    ) -> CommentPage:
        comment = self._require_comment(comment_id)
        self._require_visible_post(viewer, comment.post_id)
        after = decode_cursor(cursor) if cursor else None
        return self._page(self.comments.list_replies(comment_id, limit=limit, after=after), limit)

    def create(self, user: User, post_id: uuid.UUID, data: CommentCreate) -> CommentOut:
        self._require_visible_post(user, post_id)
        parent_id = None
        if data.parent_id is not None:
            parent = self._require_comment(data.parent_id)
            if parent.post_id != post_id:
                raise AppError(404, "Comment not found")
            # Threads are one level deep: replying to a reply attaches to its parent
            parent_id = parent.parent_id or parent.id
        comment = self.comments.create(
            post_id=post_id, author_id=user.id, parent_id=parent_id, content=data.content
        )
        self.db.commit()
        return self._to_out([self._require_comment(comment.id)])[0]

    def delete(self, user: User, comment_id: uuid.UUID) -> None:
        comment = self._require_comment(comment_id)
        post = self._require_post(comment.post_id)
        is_staff = user.role in (UserRole.MODERATOR, UserRole.ADMIN)
        if user.id not in (comment.author_id, post.author_id) and not is_staff:
            raise AppError(403, "You are not allowed to delete this comment")
        self.comments.delete(comment)
        self.db.commit()