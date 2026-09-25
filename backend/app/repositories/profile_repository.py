import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.follow import Follow, FollowStatus
from app.models.post import Post


class ProfileRepository:
    def __init__(self, db: Session):
        self.db = db

    def stats(self, user_id: uuid.UUID) -> tuple[int, int, int]:
        """Returns (followers, following, posts) for a user."""
        followers = self.db.scalar(
            select(func.count())
            .select_from(Follow)
            .where(Follow.followee_id == user_id, Follow.status == FollowStatus.ACCEPTED)
        )
        following = self.db.scalar(
            select(func.count())
            .select_from(Follow)
            .where(Follow.follower_id == user_id, Follow.status == FollowStatus.ACCEPTED)
        )
        posts = self.db.scalar(
            select(func.count()).select_from(Post).where(Post.author_id == user_id)
        )
        return followers or 0, following or 0, posts or 0