from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.models.follow import Follow, FollowStatus
from app.models.settings import PrivacySettings
from app.models.user import User
from app.repositories.follow_repository import FollowRepository
from app.repositories.profile_repository import ProfileRepository
from app.repositories.user_repository import UserRepository
from app.schemas.social import (
    FollowRequestOut,
    FollowRequestPage,
    FollowStateOut,
    PrivacyOut,
    ProfileOut,
    UserSummary,
)
from app.services.post_service import decode_cursor, encode_cursor_parts


def _display_name(user: User) -> str:
    return user.profile.display_name if user.profile else user.username


def _summary(user: User) -> UserSummary:
    return UserSummary(
        id=user.id,
        username=user.username,
        display_name=_display_name(user),
        avatar_url=user.profile.avatar_url if user.profile else None,
    )


def _is_private(user: User) -> bool:
    return bool(user.privacy_settings and user.privacy_settings.is_private)


def _state_of(row: Follow | None) -> str:
    if row is None:
        return "NONE"
    return "PENDING" if row.status == FollowStatus.PENDING else "FOLLOWING"


class FollowService:
    def __init__(self, db: Session):
        self.db = db
        self.users = UserRepository(db)
        self.follows = FollowRepository(db)
        self.stats = ProfileRepository(db)

    def _target(self, username: str) -> User:
        user = self.users.get_by_username(username)
        if user is None or not user.is_active:
            raise AppError(404, "User not found")
        return user

    def profile(self, viewer: User, username: str) -> ProfileOut:
        target = self._target(username)
        followers, following, posts = self.stats.stats(target.id)
        p = target.profile
        if target.id == viewer.id:
            relation = "SELF"
        else:
            relation = _state_of(self.follows.get(viewer.id, target.id))
        return ProfileOut(
            id=target.id,
            username=target.username,
            display_name=_display_name(target),
            bio=p.bio if p else None,
            location=p.location if p else None,
            website=p.website if p else None,
            avatar_url=p.avatar_url if p else None,
            cover_url=p.cover_url if p else None,
            created_at=target.created_at,
            followers_count=followers,
            following_count=following,
            posts_count=posts,
            is_private=_is_private(target),
            follow_state=relation,
        )

    def follow(self, viewer: User, username: str) -> FollowStateOut:
        target = self._target(username)
        if target.id == viewer.id:
            raise AppError(400, "You cannot follow yourself")
        row = self.follows.get(viewer.id, target.id)
        if row is None:
            status = FollowStatus.PENDING if _is_private(target) else FollowStatus.ACCEPTED
            row = self.follows.create(viewer.id, target.id, status)
        self.db.commit()
        return FollowStateOut(state=_state_of(row))

    def unfollow(self, viewer: User, username: str) -> FollowStateOut:
        # Also cancels a pending request
        target = self._target(username)
        self.follows.delete(viewer.id, target.id)
        self.db.commit()
        return FollowStateOut(state="NONE")

    def list_requests(self, user: User, limit: int, cursor: str | None) -> FollowRequestPage:
        before = decode_cursor(cursor) if cursor else None
        rows = self.follows.list_pending(user.id, limit=limit, before=before)
        has_more = len(rows) > limit
        rows = rows[:limit]
        items = [FollowRequestOut(user=_summary(u), requested_at=f.created_at) for f, u in rows]
        next_cursor = (
            encode_cursor_parts(rows[-1][0].created_at, rows[-1][0].id) if has_more else None
        )
        return FollowRequestPage(items=items, next_cursor=next_cursor)

    def accept_request(self, user: User, username: str) -> None:
        requester = self._target(username)
        if self.follows.accept(requester.id, user.id) == 0:
            raise AppError(404, "No pending request from this user")
        self.db.commit()

    def reject_request(self, user: User, username: str) -> None:
        requester = self._target(username)
        if self.follows.delete(requester.id, user.id, FollowStatus.PENDING) == 0:
            raise AppError(404, "No pending request from this user")
        self.db.commit()

    def remove_follower(self, user: User, username: str) -> None:
        follower = self._target(username)
        if self.follows.delete(follower.id, user.id, FollowStatus.ACCEPTED) == 0:
            raise AppError(404, "This user is not following you")
        self.db.commit()

    def set_private(self, user: User, is_private: bool) -> PrivacyOut:
        settings = user.privacy_settings
        if settings is None:
            settings = PrivacySettings(user_id=user.id)
            self.db.add(settings)
        settings.is_private = is_private
        if not is_private:
            # Going public approves everyone who was waiting
            self.follows.accept_all_pending(user.id)
        self.db.commit()
        return PrivacyOut(is_private=is_private)