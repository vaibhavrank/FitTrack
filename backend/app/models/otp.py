from sqlalchemy import Column, Integer, String, DateTime
from datetime import datetime
from app.config.database import Base

class OTP(Base):
    __tablename__ = "otp_codes"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, index=True)
    otp_code = Column(String)
    otp_hash = Column(String)
    expires_at = Column(DateTime)