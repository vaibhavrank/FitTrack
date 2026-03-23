import hashlib
import random
import secrets
from datetime import datetime, timedelta
from urllib.parse import quote_plus

from sqlalchemy.orm import Session

from app.config.email_config import send_email
from app.config.settings import settings
from app.models.otp import OTP
from app.models.user import User
from app.utils.jwt import decode_jwt, encode_jwt
from app.utils.security import hash_password, verify_password
from google.auth.transport import requests
from google.oauth2 import id_token

def generate_otp():
    return str(random.randint(100000, 999999))


async def send_otp(db: Session, email: str):
    email = email.strip().lower()
    user = db.query(User).filter(User.email == email).first()

    if not user:
        raise ValueError("No user found with this email")

    if user.auth_provider == "google":
        raise ValueError("User signed up with Google. Please use Google sign-in.")

    otp_code = generate_otp()

    expires = datetime.utcnow() + timedelta(minutes=5)
    otp_hash = hashlib.sha256(otp_code.encode()).hexdigest()

    db.query(OTP).filter(OTP.email == email).delete()
    print(f"Storing OTP for email: {email} with OTP: {otp_code} and hash: {otp_hash} expiring at: {expires}")
    otp = OTP(email=email, otp_code=otp_code, otp_hash=otp_hash, expires_at=expires)

    db.add(otp)
    db.commit()

    # Send OTP via Resend
    send_email(
        to_email=email,
        subject="Your OTP Code",
        body=f"Your OTP code is: {otp_code}. It expires in 5 minutes.",
        is_html=False,
    )

    return {"message": "OTP sent to email"}


async def verify_otp(db: Session, email: str, otp: str):

    email = email.strip()
    otp = otp.strip()

    print(f"Verifying OTP for email: {email} with OTP: {otp}")

    # hash incoming otp
    otp_hash = hashlib.sha256(otp.encode()).hexdigest()

    # debug: print all OTPs for that email
    otps = db.query(OTP).filter(OTP.email == email).all()
    for record in otps:
        print(
            f"OTP record -> email: {record.email}, otp_code: {record.otp_code}, "
            f"otp_hash: {record.otp_hash}, expires_at: {record.expires_at}"
        )
    
    # find matching record
    record = db.query(OTP).filter(
        OTP.email == email,
        OTP.otp_hash == otp_hash
    ).first()

    if not record:
        print("OTP not found")
        return None

    # check expiry
    if record.expires_at < datetime.utcnow():
        print("OTP expired")
        return None

    # find user
    user = db.query(User).filter(User.email == email).first()
    if not user:
        print("OTP verification failed: user does not exist")
        return None

    if user.auth_provider == "google":
        print("OTP verification failed: account is Google-based")
        return None

    # mark verified
    user.is_verified = True
    db.delete(record)
    db.commit()

    return user

# Google OAuth functions would go here, but are not included in this snippet.



def google_login(db: Session, token: str):

    idinfo = id_token.verify_oauth2_token(
        token,
        requests.Request(),
        settings.google_client_id
    )

    email = idinfo["email"]
    google_id = idinfo["sub"]

    user = db.query(User).filter(User.email == email).first()

    if not user:
        user = User(
            name=email.split("@")[0],
            email=email,
            google_id=google_id,
            auth_provider="google",
            is_verified=True,
        )
        db.add(user)
        db.flush()

    else:
        if user.auth_provider == "email":
            raise ValueError("Account exists with email/password and cannot sign in with Google")

        if not user.google_id:
            user.google_id = google_id
        user.auth_provider = "google"
        user.is_verified = True

    return user


def create_session(db: Session, email: str):
    """Create a JWT session token and return it along with its expiration time."""

    expires_at = datetime.utcnow() + timedelta(minutes=settings.jwt_expiration_minutes)

    session_token = encode_jwt(
        {"sub": email, "email": email},
        secret=settings.jwt_secret_key,
        exp_minutes=settings.jwt_expiration_minutes,
    )

    return session_token, expires_at


def get_user_from_session_token(db: Session, session_token: str):
    """Return the user associated with a valid JWT session token, or None."""

    if not session_token:
        return None

    payload = decode_jwt(session_token, secret=settings.jwt_secret_key)
    if not payload:
        return None

    email = payload.get("email") or payload.get("sub")
    if not email:
        return None

    return db.query(User).filter(User.email == email).first()


def signup_with_email(db: Session, name: str, email: str, password: str, confirm_password: str):
    """Register user for email signup and return created user (not verified yet)."""

    if not name.strip():
        raise ValueError("Name is required")
    if not email.strip() or not password:
        raise ValueError("Email and password are required")
    if password != confirm_password:
        raise ValueError("Password and confirm password must match")


    email = email.strip().lower()
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        if existing.auth_provider == "google":
            raise ValueError("An account exists via Google. Please use Google sign-in")
        raise ValueError("Account already exists")

    user = User(
        name=name.strip(),
        email=email,
        password_hash=hash_password(password),
        auth_provider="email",
        is_verified=False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

# def login_with_email_password(db: Session, email: str, password: str):
#     """Verify credentials and return the user if valid."""

#     email = email.strip().lower()
#     user = db.query(User).filter(User.email == email).first()

#     if not user or user.auth_provider != "email" :
#         print(f"Login failed: user not found or auth provider mismatch for email: {email}")
#         return None
#     if not verify_password(password, user.password_hash):
#         print(f"Login failed: password verification failed for email: {email}")
#         return None
#     if not user or user.auth_provider != "email" or not verify_password(password, user.password_hash):
#         return None

#     # ensure account is marked verified after successful login
#     user.is_verified = True
#     db.commit()
#     return user

def login_with_email_password(db: Session, email: str, password: str):
    """Verify credentials and return the user if valid."""

    email = email.strip().lower()
    user = db.query(User).filter(User.email == email).first()

    if not user or user.auth_provider != "email":
        print(f"Login failed: user not found or auth provider mismatch for email: {email}")
        return None
    if not verify_password(password, user.password_hash):
        print(f"Login failed: password verification failed for email: {email}")
        return None

    # ensure account is marked verified after successful login
    user.is_verified = True
    db.commit()
    return user

def generate_password_reset_token():
    return secrets.token_urlsafe(32)


async def send_password_reset(db: Session, email: str):
    """Generate and send a password reset token via email."""

    email = email.strip()

    user = db.query(User).filter(User.email == email).first()

    # For security, don't reveal whether the email exists.
    if not user:
        return {"message": "If an account exists for this email, a reset link has been sent."}

    reset_token = generate_password_reset_token()
    token_hash = hashlib.sha256(reset_token.encode()).hexdigest()
    expires = datetime.utcnow() + timedelta(hours=1)

    # Store reset token info on the user record
    user.reset_password_token_hash = token_hash
    user.reset_password_expires_at = expires
    db.commit()

    reset_link = (
        f"{settings.frontend_url.rstrip('/')}/reset-password?token={reset_token}&email={quote_plus(email)}"
    )

    send_email(
        to_email=email,
        subject="Reset your password",
        body=(
            f"Click the link below to reset your password:\n\n{reset_link}\n\n"
            f"This link expires in 1 hour.\n"
            "If you did not request a password reset, you can ignore this email."
        ),
        is_html=False,
    )

    return {"message": "If an account exists for this email, a reset link has been sent."}



def reset_password(db: Session, email: str, token: str, new_password: str):
    """Validate reset token and update the user's password."""

    email = email.strip().lower()
    token = token.strip()

    token_hash = hashlib.sha256(token.encode()).hexdigest()

    user = db.query(User).filter(User.email == email).first()
    if not user:
        return None

    if (
        not user.reset_password_token_hash
        or user.reset_password_token_hash != token_hash
        or not user.reset_password_expires_at
        or user.reset_password_expires_at < datetime.utcnow()
    ):
        return None

    user.password_hash = hash_password(new_password)
    user.is_verified = True

    # Clear reset token once used
    user.reset_password_token_hash = None
    user.reset_password_expires_at = None

    return user