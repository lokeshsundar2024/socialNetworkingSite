import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.post import BookmarkState, FeedPage
from app.services.post_service import PostService

router = APIRouter(tags=["bookmarks"])


@router.post("/posts/{post_id}/bookmark", response_model=BookmarkState)
def bookmark_post(
    post_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return PostService(db).bookmark(user, post_id)


@router.delete("/posts/{post_id}/bookmark", response_model=BookmarkState)
def unbookmark_post(
    post_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return PostService(db).unbookmark(user, post_id)


@router.get("/bookmarks", response_model=FeedPage)
def list_bookmarks(
    limit: int = Query(20, ge=1, le=50),
    cursor: str | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return PostService(db).bookmarks_feed(user, limit, cursor)