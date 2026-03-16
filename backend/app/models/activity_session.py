from sqlalchemy import Column, Integer, String, DateTime, Float, Enum
from app.config.database import Base
import enum

class ActivityType(enum.Enum):
    walk = "walk"
    run = "run"
    cycle = "cycle"

class ActivitySession(Base):
    __tablename__ = "activity_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    activity_type = Column(Enum(ActivityType))
    start_time = Column(DateTime)
    end_time = Column(DateTime, nullable=True)
    total_distance = Column(Float, default=0.0)
    status = Column(String, default="active")  # active, completed