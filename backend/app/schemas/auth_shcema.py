from pydantic import BaseModel

class ForgotPasswordRequest(BaseModel):
    email: str


class LoginRequest(BaseModel):
    email: str
    password: str