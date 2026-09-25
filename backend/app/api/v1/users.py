from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.social import (
    FollowRequestPage,
    FollowStateOut,
    PrivacyIn,
    PrivacyOut,
    ProfileOut,
)
from app.services.follow_service import FollowService

router = APIRouter(tags=["users"])


@router.get("/users/{username}", response_model=ProfileOut)
def get_profile(
    username: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return FollowService(db).profile(user, username)


@router.post("/users/{username}/follow", response_model=FollowStateOut)
def follow_user(
    username: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return FollowService(db).follow(user, username)


@router.delete("/users/{username}/follow", response_model=FollowStateOut)
def unfollow_user(
    username: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return FollowService(db).unfollow(user, username)


@router.get("/follow-requests", response_model=FollowRequestPage)
def list_follow_requests(
    limit: int = Query(20, ge=1, le=50),
    cursor: str | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return FollowService(db).list_requests(user, limit, cursor)


@router.post("/follow-requests/{username}/accept", status_code=204)
def accept_follow_request(
    username: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    FollowService(db).accept_request(user, username)


@router.post("/follow-requests/{username}/reject", status_code=204)
def reject_follow_request(
    username: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    FollowService(db).reject_request(user, username)


@router.delete("/me/followers/{username}", status_code=204)
def remove_follower(
    username: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    FollowService(db).remove_follower(user, username)


@router.patch("/me/privacy", response_model=PrivacyOut)
def update_privacy(
    data: PrivacyIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return FollowService(db).set_private(user, data.is_private)