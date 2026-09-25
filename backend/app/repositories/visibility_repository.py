import uuid

from sqlalchemy import exists, or_, select, true
from sqlalchemy.orm import Session
from sqlalchemy.sql.elements import ColumnElement

from app.models.follow import Follow, FollowStatus
from app.models.post import Post
from app.models.settings import PrivacySettings
from app.models.user import User, UserRole

STAFF_ROLES = (UserRole.MODERATOR, UserRole.ADMIN)


class VisibilityRepository:
    """Public authors are visible to everyone. Private authors are visible only to
    themselves, their accepted followers, and staff."""

    def __init__(self, db: Session):
        self.db = db

    def _followed_ids(self, viewer_id: uuid.UUID):
        return select(Follow.followee_id).where(
            Follow.follower_id == viewer_id, Follow.status == FollowStatus.ACCEPTED
        )

    def post_filter(self, viewer: User) -> ColumnElement[bool]:
        """SQL condition for posts the viewer is allowed to see."""
        if viewer.role in STAFF_ROLES:
            return true()
        private_authors = select(PrivacySettings.user_id).where(
            PrivacySettings.is_private.is_(True)
        )
        return or_(
            Post.author_id == viewer.id,
            Post.author_id.not_in(private_authors),
            Post.author_id.in_(self._followed_ids(viewer.id)),
        )

    def following_filter(self, viewer: User) -> ColumnElement[bool]:
        """SQL condition for posts by people the viewer follows, plus their own."""
        return or_(
            Post.author_id == viewer.id,
            Post.author_id.in_(self._followed_ids(viewer.id)),
        )

    def can_view(self, viewer: User, author_id: uuid.UUID) -> bool:
        if viewer.id == author_id or viewer.role in STAFF_ROLES:
            return True
        is_private = self.db.scalar(
            select(PrivacySettings.is_private).where(PrivacySettings.user_id == author_id)
        )
        if not is_private:
            return True
        return bool(
            self.db.scalar(
                select(
                    exists().where(
                        Follow.follower_id == viewer.id,
                        Follow.followee_id == author_id,
                        Follow.status == FollowStatus.ACCEPTED,
                    )
                )
            )
        )