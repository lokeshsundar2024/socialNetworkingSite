import uuid
from datetime import datetime

from sqlalchemy import Column, Computed, DateTime, ForeignKey, Index, String, Table, Text
from sqlalchemy.dialects.postgresql import TSVECTOR
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.base import TimestampMixin, UUIDPrimaryKeyMixin

post_hashtags = Table(
    "post_hashtags",
    Base.metadata,
    Column("post_id", ForeignKey("posts.id", ondelete="CASCADE"), primary_key=True),
    Column("hashtag_id", ForeignKey("hashtags.id", ondelete="CASCADE"), primary_key=True, index=True),
)


class Hashtag(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "hashtags"

    tag: Mapped[str] = mapped_column(String(50), unique=True, index=True)


class Post(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "posts"
    __table_args__ = (
        Index("ix_posts_created_at_id", "created_at", "id"),
        Index("ix_posts_content_tsv", "content_tsv", postgresql_using="gin"),
    )

    author_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    content: Mapped[str] = mapped_column(Text)
    edited_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # Maintained by Postgres itself whenever content changes; used only for search
    content_tsv: Mapped[str | None] = mapped_column(
        TSVECTOR,
        Computed("to_tsvector('english', content)", persisted=True),
        deferred=True,
    )

    author: Mapped["User"] = relationship()
    hashtags: Mapped[list[Hashtag]] = relationship(secondary=post_hashtags)