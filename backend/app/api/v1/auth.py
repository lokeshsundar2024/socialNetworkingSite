from fastapi import APIRouter, Cookie, Depends, Request, Response
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.errors import AppError
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse, UserOut
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])

REFRESH_COOKIE = "refresh_token"
COOKIE_PATH = "/api/v1/auth"


def _set_refresh_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=REFRESH_COOKIE,
        value=token,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        max_age=settings.refresh_token_days * 86400,
        path=COOKIE_PATH,
    )


def _client_info(request: Request) -> tuple[str | None, str | None]:
    ip = request.client.host if request.client else None
    return request.headers.get("user-agent"), ip


def _token_response(user: User, access: str) -> TokenResponse:
    return TokenResponse(access_token=access, user=UserOut.model_validate(user))


@router.post("/register", response_model=TokenResponse, status_code=201)
def register(
    data: RegisterRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    ua, ip = _client_info(request)
    user, access, refresh = AuthService(db).register(data, ua, ip)
    _set_refresh_cookie(response, refresh)
    return _token_response(user, access)


@router.post("/login", response_model=TokenResponse)
def login(
    data: LoginRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    ua, ip = _client_info(request)
    user, access, refresh = AuthService(db).login(data.identifier, data.password, ua, ip)
    _set_refresh_cookie(response, refresh)
    return _token_response(user, access)


@router.post("/refresh", response_model=TokenResponse)
def refresh(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    refresh_token: str | None = Cookie(default=None),
):
    if not refresh_token:
        raise AppError(401, "Missing refresh token")
    ua, ip = _client_info(request)
    user, access, new_refresh = AuthService(db).refresh(refresh_token, ua, ip)
    _set_refresh_cookie(response, new_refresh)
    return _token_response(user, access)


@router.post("/logout", status_code=204)
def logout(
    response: Response,
    db: Session = Depends(get_db),
    refresh_token: str | None = Cookie(default=None),
):
    if refresh_token:
        AuthService(db).logout(refresh_token)
    response.delete_cookie(REFRESH_COOKIE, path=COOKIE_PATH)


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user