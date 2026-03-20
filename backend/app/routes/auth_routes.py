from fastapi import APIRouter, Body, Cookie, Depends, Header, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.config.database import get_db
from app.controllers.auth_controller import (
    create_session,
    get_user_from_session_token,
    google_login,
    login_with_email_password,
    send_otp,
    send_password_reset,
    reset_password,
    verify_otp,
)
from app.schemas.auth_shcema import ForgotPasswordRequest, LoginRequest

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/send-otp")
async def send_otp_route(email: str, db: Session = Depends(get_db)):

    return await send_otp(db, email)

    

@router.post("/verify-otp")
async def verify_otp_route(
    email: str,
    otp: str,
    response: Response,
    db: Session = Depends(get_db),
):
    with db.begin():
        user = await verify_otp(db, email.strip(), otp.strip())

        if not user:
            return {"error": "Invalid OTP"}

        session_token, expires_at = create_session(db, user.email)

    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        samesite="none",
        secure=False,
        expires=int(expires_at.timestamp()),
    )

    return {
        "message": "OTP verified successfully",
        "user_id": user.id
    }



@router.post("/login")
def login_route(data: LoginRequest, response: Response, db: Session = Depends(get_db)):
    with db.begin():
        user = login_with_email_password(db, data.email, data.password)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
            )
        session_token, expires_at = create_session(db, user.email)

    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        samesite="none",
        secure=False,
        expires=int(expires_at.timestamp()),
    )

    return {
        "message": "Login successful",
        "user_id": user.id,
    }


def get_current_user(
    session_token: str | None = Cookie(None, alias="session_token"),
    authorization: str | None = Header(None, alias="Authorization"),
    db: Session = Depends(get_db),
):
    token = None

    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]
    if not token:
        token = session_token

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    user = get_user_from_session_token(db, token)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session",
        )

    return user


@router.get("/me")
def me_route(current_user=Depends(get_current_user)):
    return {"user_id": current_user.id, "email": current_user.email}


@router.post("/google-login")
def google_login_route(token: str, response: Response, db: Session = Depends(get_db)):
    with db.begin():
        user = google_login(db, token)
        session_token, expires_at = create_session(db, user.email)

    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        samesite="none",
        secure=False,
        expires=int(expires_at.timestamp()),
    )

    return {
        "message": "Google login successful",
        "user_id": user.id
    }


@router.post("/forgot-password")
async def forgot_password_route(
    data: ForgotPasswordRequest,
    db: Session = Depends(get_db)
):
    print(f"Received forgot password request for email: {data.email}")
    return await send_password_reset(db, data.email)

@router.post("/reset-password")
async def reset_password_route(
    email: str = Body(...),
    token: str = Body(...),
    password: str = Body(...),
    db: Session = Depends(get_db),
):
    with db.begin():
        user = reset_password(db, email.strip(), token.strip(), password)

        if not user:
            return {"error": "Invalid or expired reset token"}

    return {"message": "Password has been reset successfully"}
