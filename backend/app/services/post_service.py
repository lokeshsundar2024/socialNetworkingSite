import base64
import re
import uuid
from datetime import datetime
from typing import Any

from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.models.post import Post
from app.models.user import User, UserRole
from app.repositories.bookmark_repository import BookmarkRepository
from app.repositories.comment_repository import CommentRepository
from app.repositories.like_repository import LikeRepository
from app.repositories.post_repository import PostRepository
from app.repositories.visibility_repository import VisibilityRepository
from app.schemas.post import AuthorOut, BookmarkState, FeedPage, LikeState, PostOut

HASHTAG_RE = re.compile(r"(?<![\w#])#([A-Za-z][A-Za-z0-9_]{0,49})")
MAX_TAGS = 20


def extract_hashtags(text: str) -> list[str]:
    tags: list[str] = []
    for match in HASHTAG_RE.finditer(text):
        tag = match.group(1).lower()
        if tag not in tags:
            tags.append(tag)
    return tags[:MAX_TAGS]


def encode_cursor_parts(created_at: datetime, item_id: uuid.UUID) -> str:
    raw = f"{created_at.isoformat()}|{item_id}"
    return base64.urlsafe_b64encode(raw.encode()).decode()


def encode_cursor(item: Any) -> str:
    """Works for any object with created_at and id (posts, comments)."""
    return encode_cursor_parts(item.created_at, item.id)


def decode_cursor(cursor: str) -> tuple[datetime, uuid.UUID]:
    try:
        raw = base64.urlsafe_b64decode(cursor.encode()).decode()
        created_at, item_id = raw.split("|")
        return datetime.fromisoformat(created_at), uuid.UUID(item_id)
    except (ValueError, UnicodeDecodeError):
        raise AppError(400, "Invalid cursor")


def to_post_out(
    post: Post,
    like_count: int,
    liked_by_me: bool,
    comment_count: int = 0,
    bookmarked_by_me: bool = False,
) -> PostOut:
    author = post.author
    profile = author.profile
    return PostOut(
        id=post.id,
        content=post.content,
        created_at=post.created_at,
        edited_at=post.edited_at,
        author=AuthorOut(
            id=author.id,
            username=author.username,
            display_name=profile.display_name if profile else author.username,
            avatar_url=profile.avatar_url if profile else None,
        ),
        hashtags=sorted(h.tag for h in post.hashtags),
        like_count=like_count,
        liked_by_me=liked_by_me,
        comment_count=comment_count,
        bookmarked_by_me=bookmarked_by_me,
    )


class PostService:
    def __init__(self, db: Session):
        self.db = db
        self.posts = PostRepository(db)
        self.likes = LikeRepository(db)
        self.comments = CommentRepository(db)
        self.bookmarks = BookmarkRepository(db)
        self.visibility = VisibilityRepository(db)

    def _to_out(self, posts: list[Post], viewer: User) -> list[PostOut]:
        # Four small indexed queries for the whole page, not one per post
        ids = [p.id for p in posts]
        counts = self.likes.counts_for(ids)
        liked = self.likes.liked_ids(viewer.id, ids)
        comment_counts = self.comments.counts_for_posts(ids)
        bookmarked = self.bookmarks.bookmarked_ids(viewer.id, ids)
        return [
            to_post_out(
                p,
                counts.get(p.id, 0),
                p.id in liked,
                comment_counts.get(p.id, 0),
                p.id in bookmarked,
            )
            for p in posts
        ]

    def _get(self, post_id: uuid.UUID) -> Post:
        post = self.posts.get(post_id)
        if post is None:
            raise AppError(404, "Post not found")
        return post

    def _get_visible(self, viewer: User, post_id: uuid.UUID) -> Post:
        post = self._get(post_id)
        if not self.visibility.can_view(viewer, post.author_id):
            # 404, not 403, so nobody can tell that a private post exists
            raise AppError(404, "Post not found")
        return post

    def get(self, viewer: User, post_id: uuid.UUID) -> PostOut:
        return self._to_out([self._get_visible(viewer, post_id)], viewer)[0]

    def create(self, user: User, content: str) -> PostOut:
        post = self.posts.create(
            author_id=user.id, content=content, tags=extract_hashtags(content)
        )
        self.db.commit()
        return self._to_out([self._get(post.id)], user)[0]

    def update(self, user: User, post_id: uuid.UUID, content: str) -> PostOut:
        post = self._get(post_id)
        if post.author_id != user.id:
            raise AppError(403, "You can only edit your own posts")
        self.posts.update(post, content, extract_hashtags(content))
        self.db.commit()
        return self._to_out([post], user)[0]

    def delete(self, user: User, post_id: uuid.UUID) -> None:
        post = self._get(post_id)
        is_staff = user.role in (UserRole.MODERATOR, UserRole.ADMIN)
        if post.author_id != user.id and not is_staff:
            raise AppError(403, "You are not allowed to delete this post")
        self.posts.delete(post)
        self.db.commit()

    def feed(
        self, viewer: User, limit: int, cursor: str | None, scope: str = "all"
    ) -> FeedPage:
        before = decode_cursor(cursor) if cursor else None
        clause = (
            self.visibility.following_filter(viewer)
            if scope == "following"
            else self.visibility.post_filter(viewer)
        )
        rows = self.posts.list_feed(limit=limit, before=before, clauses=[clause])
        has_more = len(rows) > limit
        rows = rows[:limit]
        return FeedPage(
            items=self._to_out(rows, viewer),
            next_cursor=encode_cursor(rows[-1]) if has_more else None,
        )

    def like(self, user: User, post_id: uuid.UUID) -> LikeState:
        self._get_visible(user, post_id)
        self.likes.add(user.id, post_id)
        self.db.commit()
        return LikeState(like_count=self.likes.count(post_id), liked_by_me=True)

    def unlike(self, user: User, post_id: uuid.UUID) -> LikeState:
        self._get(post_id)  # removing your own like always works
        self.likes.remove(user.id, post_id)
        self.db.commit()
        return LikeState(like_count=self.likes.count(post_id), liked_by_me=False)

    def bookmark(self, user: User, post_id: uuid.UUID) -> BookmarkState:
        self._get_visible(user, post_id)
        self.bookmarks.add(user.id, post_id)
        self.db.commit()
        return BookmarkState(bookmarked_by_me=True)

    def unbookmark(self, user: User, post_id: uuid.UUID) -> BookmarkState:
        self._get(post_id)  # removing your own bookmark always works
        self.bookmarks.remove(user.id, post_id)
        self.db.commit()
        return BookmarkState(bookmarked_by_me=False)

    def bookmarks_feed(self, viewer: User, limit: int, cursor: str | None) -> FeedPage:
        before = decode_cursor(cursor) if cursor else None
        rows = self.bookmarks.list_for_user(
            viewer.id,
            limit=limit,
            before=before,
            clauses=[self.visibility.post_filter(viewer)],
        )
        has_more = len(rows) > limit
        rows = rows[:limit]
        next_cursor = encode_cursor_parts(rows[-1][1], rows[-1][2]) if has_more else None
        return FeedPage(items=self._to_out([r[0] for r in rows], viewer), next_cursor=next_cursor)