from sqlalchemy import Column, Integer, String, DateTime
from datetime import datetime
from app.config.database import Base


class PasswordReset(Base):
    __tablename__ = "password_reset_tokens"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, index=True)
    token_hash = Column(String)
    expires_at = Column(DateTime)
