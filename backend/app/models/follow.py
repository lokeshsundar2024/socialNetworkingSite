import enum
import uuid

from sqlalchemy import CheckConstraint, Enum, ForeignKey, Index, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base
from app.models.base import TimestampMixin, UUIDPrimaryKeyMixin


class FollowStatus(str, enum.Enum):
    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"


class Follow(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "follows"
    __table_args__ = (
        UniqueConstraint("follower_id", "followee_id", name="uq_follows_pair"),
        CheckConstraint("follower_id <> followee_id", name="ck_follows_not_self"),
        Index("ix_follows_followee_status", "followee_id", "status", "created_at"),
    )

    follower_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    followee_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    status: Mapped[FollowStatus] = mapped_column(
        Enum(FollowStatus, name="follow_status"),
        default=FollowStatus.ACCEPTED,
        server_default="ACCEPTED",
    )