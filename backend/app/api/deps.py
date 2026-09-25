from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.core.security import decode_access_token
from app.db.session import get_db
from app.models.user import User
from app.repositories.user_repository import UserRepository

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if creds is None:
        raise AppError(401, "Not authenticated")
    user_id = decode_access_token(creds.credentials)
    if user_id is None:
        raise AppError(401, "Invalid or expired token")
    user = UserRepository(db).get_by_id(user_id)
    if user is None or not user.is_active or user.is_suspended:
        raise AppError(401, "Not authenticated")
    return user