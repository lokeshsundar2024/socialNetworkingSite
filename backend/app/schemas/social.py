import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel

FollowState = Literal["NONE", "PENDING", "FOLLOWING"]
RelationState = Literal["SELF", "NONE", "PENDING", "FOLLOWING"]


class FollowStateOut(BaseModel):
    state: FollowState


class UserSummary(BaseModel):
    id: uuid.UUID
    username: str
    display_name: str
    avatar_url: str | None


class ProfileOut(BaseModel):
    id: uuid.UUID
    username: str
    display_name: str
    bio: str | None
    location: str | None
    website: str | None
    avatar_url: str | None
    cover_url: str | None
    created_at: datetime
    followers_count: int
    following_count: int
    posts_count: int
    is_private: bool
    follow_state: RelationState


class FollowRequestOut(BaseModel):
    user: UserSummary
    requested_at: datetime


class FollowRequestPage(BaseModel):
    items: list[FollowRequestOut]
    next_cursor: str | None


class PrivacyIn(BaseModel):
    is_private: bool


class PrivacyOut(BaseModel):
    is_private: bool