from sqlalchemy.orm import Session

from app.models.user import User
from app.repositories.search_repository import SearchRepository
from app.schemas.post import FeedPage
from app.schemas.search import HashtagResult
from app.schemas.social import UserSummary
from app.services.post_service import PostService, decode_cursor, encode_cursor


def _to_summary(user: User) -> UserSummary:
    profile = user.profile
    return UserSummary(
        id=user.id,
        username=user.username,
        display_name=profile.display_name if profile else user.username,
        avatar_url=profile.avatar_url if profile else None,
    )


class SearchService(PostService):
    """Search endpoints. Reuses PostService for counts, visibility and serialization."""

    def __init__(self, db: Session):
        super().__init__(db)
        self.search = SearchRepository(db)

    def _page(self, viewer: User, clauses: list, limit: int, cursor: str | None) -> FeedPage:
        before = decode_cursor(cursor) if cursor else None
        rows = self.posts.list_feed(limit=limit, before=before, clauses=clauses)
        has_more = len(rows) > limit
        rows = rows[:limit]
        return FeedPage(
            items=self._to_out(rows, viewer),
            next_cursor=encode_cursor(rows[-1]) if has_more else None,
        )

    def search_users(self, q: str, limit: int) -> list[UserSummary]:
        q = q.strip().lstrip("@")
        if not q:
            return []
        return [_to_summary(u) for u in self.search.users(q, limit)]

    def search_hashtags(self, viewer: User, q: str, limit: int) -> list[HashtagResult]:
        q = q.strip().lstrip("#")
        if not q:
            return []
        rows = self.search.hashtags(q, limit, self.visibility.post_filter(viewer))
        return [HashtagResult(tag=tag, post_count=n) for tag, n in rows]

    def search_posts(self, viewer: User, q: str, limit: int, cursor: str | None) -> FeedPage:
        q = q.strip()
        if len(q) < 2:
            return FeedPage(items=[], next_cursor=None)
        clauses = [self.visibility.post_filter(viewer), self.search.match_clause(q)]
        return self._page(viewer, clauses, limit, cursor)

    def posts_for_hashtag(
        self, viewer: User, tag: str, limit: int, cursor: str | None
    ) -> FeedPage:
        tag = tag.strip().lstrip("#")
        if not tag:
            return FeedPage(items=[], next_cursor=None)
        clauses = [self.visibility.post_filter(viewer), self.search.hashtag_clause(tag)]
        return self._page(viewer, clauses, limit, cursor)