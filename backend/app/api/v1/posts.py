import uuid
from typing import Literal
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.post import FeedPage, LikeState, PostCreate, PostOut
from app.services.post_service import PostService

router = APIRouter(prefix="/posts", tags=["posts"])


@router.post("", response_model=PostOut, status_code=201)
def create_post(
    data: PostCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return PostService(db).create(user, data.content)


@router.get("", response_model=FeedPage)
def list_posts(
    limit: int = Query(20, ge=1, le=50),
    cursor: str | None = None,
    scope: Literal["all", "following"] = "all",
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return PostService(db).feed(user, limit, cursor, scope)


@router.get("/{post_id}", response_model=PostOut)
def get_post(
    post_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return PostService(db).get(user, post_id)


@router.patch("/{post_id}", response_model=PostOut)
def edit_post(
    post_id: uuid.UUID,
    data: PostCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return PostService(db).update(user, post_id, data.content)


@router.delete("/{post_id}", status_code=204)
def delete_post(
    post_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    PostService(db).delete(user, post_id)


@router.post("/{post_id}/like", response_model=LikeState)
def like_post(
    post_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return PostService(db).like(user, post_id)


@router.delete("/{post_id}/like", response_model=LikeState)
def unlike_post(
    post_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return PostService(db).unlike(user, post_id)