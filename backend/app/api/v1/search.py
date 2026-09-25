from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.post import FeedPage
from app.schemas.search import HashtagResult
from app.schemas.social import UserSummary
from app.services.search_service import SearchService

router = APIRouter(tags=["search"])


@router.get("/search/users", response_model=list[UserSummary])
def search_users(
    q: str = Query(..., min_length=1, max_length=50),
    limit: int = Query(20, ge=1, le=50),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return SearchService(db).search_users(q, limit)


@router.get("/search/hashtags", response_model=list[HashtagResult])
def search_hashtags(
    q: str = Query(..., min_length=1, max_length=50),
    limit: int = Query(20, ge=1, le=50),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return SearchService(db).search_hashtags(user, q, limit)


@router.get("/search/posts", response_model=FeedPage)
def search_posts(
    q: str = Query(..., min_length=1, max_length=100),
    limit: int = Query(20, ge=1, le=50),
    cursor: str | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return SearchService(db).search_posts(user, q, limit, cursor)


@router.get("/hashtags/{tag}/posts", response_model=FeedPage)
def hashtag_posts(
    tag: str,
    limit: int = Query(20, ge=1, le=50),
    cursor: str | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return SearchService(db).posts_for_hashtag(user, tag, limit, cursor)