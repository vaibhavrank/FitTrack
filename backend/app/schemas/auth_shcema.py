from pydantic import BaseModel
from typing import Optional

class ForgotPasswordRequest(BaseModel):
    email: str


class SignupRequest(BaseModel):
    name: str
    email: str
    password: str
    confirm_password: str


class LoginRequest(BaseModel):
    email: str
    method: Optional[str] = "password"  # "password" or "otp"
    password: Optional[str] = None
    otp: Optional[str] = None
