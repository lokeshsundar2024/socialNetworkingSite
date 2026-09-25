import uuid
from datetime import datetime

from pydantic import BaseModel, Field, field_validator


class PostCreate(BaseModel):
    content: str = Field(max_length=2000)

    @field_validator("content")
    @classmethod
    def not_blank(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Post cannot be empty")
        return v


class AuthorOut(BaseModel):
    id: uuid.UUID
    username: str
    display_name: str
    avatar_url: str | None


class PostOut(BaseModel):
    id: uuid.UUID
    content: str
    created_at: datetime
    edited_at: datetime | None
    author: AuthorOut
    hashtags: list[str]
    like_count: int = 0
    liked_by_me: bool = False
    comment_count: int = 0
    bookmarked_by_me: bool = False


class LikeState(BaseModel):
    like_count: int
    liked_by_me: bool


class FeedPage(BaseModel):
    items: list[PostOut]
    next_cursor: str | None

class BookmarkState(BaseModel):
    bookmarked_by_me: bool