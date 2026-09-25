import uuid
from datetime import datetime

from pydantic import BaseModel, Field, field_validator

from app.schemas.post import AuthorOut


class CommentCreate(BaseModel):
    content: str = Field(max_length=1000)
    parent_id: uuid.UUID | None = None

    @field_validator("content")
    @classmethod
    def not_blank(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Comment cannot be empty")
        return v


class CommentOut(BaseModel):
    id: uuid.UUID
    post_id: uuid.UUID
    parent_id: uuid.UUID | None
    content: str
    created_at: datetime
    author: AuthorOut
    reply_count: int


class CommentPage(BaseModel):
    items: list[CommentOut]
    next_cursor: str | None