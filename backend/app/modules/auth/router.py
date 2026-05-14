"""Authentication endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.config import settings
from app.core.database import get_db
from app.core.security import get_current_user, decode_refresh_token, create_access_token, create_refresh_token
from app.modules.auth.schemas import (
    UserRegisterRequest,
    UserLoginRequest,
    TokenResponse,
    UserResponse,
)
from app.modules.auth.service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])
_limiter = Limiter(key_func=get_remote_address)


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user",
)
@_limiter.limit("3/minute")
async def register(
    request: Request,
    body: UserRegisterRequest,
    db: Session = Depends(get_db),
) -> UserResponse:
    service = AuthService(db)
    return service.register(body)


@router.post(
    "/login",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="User login",
)
@_limiter.limit("5/minute")
async def login(
    request: Request,
    body: UserLoginRequest,
    db: Session = Depends(get_db),
) -> TokenResponse:
    """
    Authenticate user and receive JWT token.

    - **email**: User email
    - **password**: User password

    Returns access token with 24-hour expiration.
    """
    service = AuthService(db)
    user, token, refresh = service.login(body)
    return TokenResponse(access_token=token, refresh_token=refresh, expires_in=settings.JWT_EXPIRATION_HOURS * 3600)


class RefreshRequest(BaseModel):
    refresh_token: str


@router.post(
    "/refresh",
    response_model=TokenResponse,
    summary="Exchange refresh token for new access + refresh tokens",
)
async def refresh(body: RefreshRequest) -> TokenResponse:
    payload = decode_refresh_token(body.refresh_token)
    if not payload or not payload.get("sub"):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired refresh token")
    # Preserve ALL tenant claims so the new token stays properly scoped.
    claims: dict = {"sub": payload["sub"]}
    if payload.get("company_id"):
        claims["company_id"] = payload["company_id"]
    if payload.get("role"):
        claims["role"] = payload["role"]
    if payload.get("email"):
        claims["email"] = payload["email"]
    return TokenResponse(
        access_token=create_access_token(claims),
        refresh_token=create_refresh_token(claims),
        expires_in=settings.JWT_EXPIRATION_HOURS * 3600,
    )


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get current user info",
)
async def get_current_user_info(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserResponse:
    """
    Get information about the currently authenticated user.

    Requires valid JWT token in Authorization header.
    Returns company_id from JWT so the frontend knows the active tenant.
    """
    service = AuthService(db)
    user_response = service.get_user_by_id(current_user["sub"])
    if not user_response:
        from app.shared.exceptions import NotFoundError
        raise NotFoundError("User not found")
    # Inject tenant context from JWT — frontend needs this to scope requests
    user_response.company_id = current_user.get("company_id")
    return user_response


# ── User Preferences ──────────────────────────────────────────────────


class PrefPatch(BaseModel):
    """Partial update: only the keys provided are merged into existing prefs."""
    prefs: dict


@router.get(
    "/me/preferences",
    summary="Get current user preferences",
)
async def get_preferences(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Return the full preferences object for the authenticated user."""
    from app.modules.auth.models import UserPreference
    from sqlalchemy import select as _select
    row = db.execute(
        _select(UserPreference).where(UserPreference.user_id == current_user["sub"])
    ).scalars().first()
    return {"prefs": row.prefs if row else {}}


@router.patch(
    "/me/preferences",
    summary="Merge-update current user preferences",
)
async def patch_preferences(
    body: PrefPatch,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Deep-merge `body.prefs` into existing preferences and persist."""
    from app.modules.auth.models import UserPreference
    from sqlalchemy import select as _select
    import uuid

    row = db.execute(
        _select(UserPreference).where(UserPreference.user_id == current_user["sub"])
    ).scalars().first()

    if row:
        merged = {**(row.prefs or {}), **body.prefs}
        # SQLAlchemy needs a new dict reference to detect JSON change
        row.prefs = merged
        db.add(row)
    else:
        row = UserPreference(
            id=str(uuid.uuid4()),
            user_id=current_user["sub"],
            prefs=body.prefs,
        )
        db.add(row)

    db.commit()
    db.refresh(row)
    return {"prefs": row.prefs}
