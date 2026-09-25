import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.comment import CommentCreate, CommentOut, CommentPage
from app.services.comment_service import CommentService

router = APIRouter(tags=["comments"])


@router.get("/posts/{post_id}/comments", response_model=CommentPage)
def list_comments(
    post_id: uuid.UUID,
    limit: int = Query(20, ge=1, le=50),
    cursor: str | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return CommentService(db).list_for_post(user, post_id, limit, cursor)


@router.post("/posts/{post_id}/comments", response_model=CommentOut, status_code=201)
def create_comment(
    post_id: uuid.UUID,
    data: CommentCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return CommentService(db).create(user, post_id, data)


@router.get("/comments/{comment_id}/replies", response_model=CommentPage)
def list_replies(
    comment_id: uuid.UUID,
    limit: int = Query(20, ge=1, le=50),
    cursor: str | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return CommentService(db).list_replies(user, comment_id, limit, cursor)


@router.delete("/comments/{comment_id}", status_code=204)
def delete_comment(
    comment_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    CommentService(db).delete(user, comment_id)