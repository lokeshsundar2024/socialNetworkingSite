from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.models.post import Post
from app.models.user import User
from app.repositories.liked_posts_repository import LikedPostsRepository
from app.repositories.user_repository import UserRepository
from app.schemas.post import FeedPage
from app.services.post_service import (
    PostService,
    decode_cursor,
    encode_cursor,
    encode_cursor_parts,
)


class UserPostsService(PostService):
    """Profile-page feeds. Reuses PostService for counts, visibility and serialization."""

    def __init__(self, db: Session):
        super().__init__(db)
        self.users = UserRepository(db)
        self.liked = LikedPostsRepository(db)

    def user_posts(self, viewer: User, username: str, limit: int, cursor: str | None) -> FeedPage:
        target = self.users.get_by_username(username)
        if target is None or not target.is_active:
            raise AppError(404, "User not found")
        if not self.visibility.can_view(viewer, target.id):
            raise AppError(403, "This account is private")
        before = decode_cursor(cursor) if cursor else None
        rows = self.posts.list_feed(
            limit=limit, before=before, clauses=[Post.author_id == target.id]
        )
        has_more = len(rows) > limit
        rows = rows[:limit]
        return FeedPage(
            items=self._to_out(rows, viewer),
            next_cursor=encode_cursor(rows[-1]) if has_more else None,
        )

    def my_likes(self, viewer: User, limit: int, cursor: str | None) -> FeedPage:
        before = decode_cursor(cursor) if cursor else None
        rows = self.liked.list_for_user(
            viewer.id,
            limit=limit,
            before=before,
            clauses=[self.visibility.post_filter(viewer)],
        )
        has_more = len(rows) > limit
        rows = rows[:limit]
        next_cursor = encode_cursor_parts(rows[-1][1], rows[-1][2]) if has_more else None
        return FeedPage(items=self._to_out([r[0] for r in rows], viewer), next_cursor=next_cursor)