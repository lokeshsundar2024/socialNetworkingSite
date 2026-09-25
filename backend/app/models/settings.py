import enum
import uuid

from sqlalchemy import Boolean, Enum, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.base import TimestampMixin, UUIDPrimaryKeyMixin


class Audience(str, enum.Enum):
    EVERYONE = "EVERYONE"
    FOLLOWERS = "FOLLOWERS"
    NOBODY = "NOBODY"


audience_type = Enum(Audience, name="audience")


class UserSettings(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "user_settings"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True
    )
    theme: Mapped[str] = mapped_column(String(10), default="system", server_default="system")
    email_notifications: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    push_notifications: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")

    user: Mapped["User"] = relationship(back_populates="user_settings")


class PrivacySettings(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "privacy_settings"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True
    )
    is_private: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    who_can_message: Mapped[Audience] = mapped_column(
        audience_type, default=Audience.EVERYONE, server_default="EVERYONE"
    )
    who_can_see_posts: Mapped[Audience] = mapped_column(
        audience_type, default=Audience.EVERYONE, server_default="EVERYONE"
    )
    who_can_see_profile: Mapped[Audience] = mapped_column(
        audience_type, default=Audience.EVERYONE, server_default="EVERYONE"
    )
    who_can_mention: Mapped[Audience] = mapped_column(
        audience_type, default=Audience.EVERYONE, server_default="EVERYONE"
    )
    who_can_comment: Mapped[Audience] = mapped_column(
        audience_type, default=Audience.EVERYONE, server_default="EVERYONE"
    )

    user: Mapped["User"] = relationship(back_populates="privacy_settings")