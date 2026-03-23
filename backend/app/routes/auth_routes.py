from fastapi import APIRouter, Body, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.config.database import get_db
from app.controllers.auth_controller import (
    create_session,
    get_user_from_session_token,
    google_login,
    login_with_email_password,
    signup_with_email,
    send_otp,
    send_password_reset,
    reset_password,
    verify_otp,
)
from app.schemas.auth_shcema import ForgotPasswordRequest, LoginRequest, SignupRequest

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/send-otp")
async def send_otp_route(email: str, db: Session = Depends(get_db)):
    try:
        return await send_otp(db, email)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/verify-otp")
async def verify_otp_route(
    email: str,
    otp: str,
    db: Session = Depends(get_db),
):
    with db.begin():
        user = await verify_otp(db, email.strip().lower(), otp.strip())

        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid OTP or user")

        session_token, expires_at = create_session(db, user.email)

    return {
        "message": "OTP verified successfully",
        "user_id": user.id,
        "token": session_token,
        "expires_at": expires_at.isoformat(),
    }


@router.post("/signup")
async def signup_route(data: SignupRequest, db: Session = Depends(get_db)):
    with db.begin():
        try:
            new_user = signup_with_email(db, data.name, data.email, data.password, data.confirm_password)
        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

        # Send OTP for verification
        try:
            await send_otp(db, new_user.email)
        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    return {
        "message": "Signup initiated. OTP sent to email. Verify OTP to complete registration.",
        "user_id": new_user.id,
    }


@router.post("/login")
async def login_route(data: LoginRequest, db: Session = Depends(get_db)):
    email = data.email.strip().lower()

    if data.method == "otp":
        if not data.otp:
            # just send OTP, client will verify with /verify-otp
            try:
                await send_otp(db, email)
            except ValueError as e:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
            return {"message": "OTP sent"}

        # verify OTP and issue token
        with db.begin():
            user = await verify_otp(db, email, data.otp.strip())
            if not user:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid OTP")
            session_token, expires_at = create_session(db, user.email)
            return {
                "message": "Login successful",
                "user_id": user.id,
                "token": session_token,
                "expires_at": expires_at.isoformat(),
            }

    # default: password login
    if not data.password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password required")

    with db.begin():
        user = login_with_email_password(db, email, data.password)
        print(f"Login attempt for email: {data.email}, user found: {user.email if user else 'None'}")
        # delete all users from db.query(User).all():

        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

        session_token, expires_at = create_session(db, user.email)

    return {
        "message": "Login successful",
        "user_id": user.id,
        "token": session_token,
        "expires_at": expires_at.isoformat(),
    }


def get_current_user(
    authorization: str | None = Header(None, alias="Authorization"),
    db: Session = Depends(get_db),
):

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    token = authorization.split(" ", 1)[1]
    print("Extracted token:", token)

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
def google_login_route(token: str, db: Session = Depends(get_db)):
    with db.begin():
        try:
            user = google_login(db, token)
        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

        session_token, expires_at = create_session(db, user.email)

    return {
        "message": "Google login successful",
        "user_id": user.id,
        "token": session_token,
        "expires_at": expires_at.isoformat(),
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
