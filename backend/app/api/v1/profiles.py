from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.post import FeedPage
from app.schemas.profile import ProfileUpdate
from app.schemas.social import ProfileOut
from app.services.profile_service import ProfileService
from app.services.user_posts_service import UserPostsService

router = APIRouter(tags=["profiles"])


@router.get("/users/{username}/posts", response_model=FeedPage)
def user_posts(
    username: str,
    limit: int = Query(20, ge=1, le=50),
    cursor: str | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return UserPostsService(db).user_posts(user, username, limit, cursor)


@router.get("/me/likes", response_model=FeedPage)
def my_likes(
    limit: int = Query(20, ge=1, le=50),
    cursor: str | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return UserPostsService(db).my_likes(user, limit, cursor)


@router.patch("/me/profile", response_model=ProfileOut)
def update_profile(
    data: ProfileUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return ProfileService(db).update(user, data)