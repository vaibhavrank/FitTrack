from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import enum

class ActivityType(str, enum.Enum):
    walk = "walk"
    run = "run"
    cycle = "cycle"

class StartActivityRequest(BaseModel):
    activity_type: ActivityType

class LocationUpdate(BaseModel):
    session_id: int
    latitude: float
    longitude: float
    accuracy: float
    speed: Optional[float] = None
    timestamp: datetime

class EndActivityRequest(BaseModel):
    session_id: int

class ActivitySessionResponse(BaseModel):
    id: int
    user_id: int
    activity_type: ActivityType
    start_time: datetime
    end_time: Optional[datetime]
    total_distance: float
    status: str

class TerritoryResponse(BaseModel):
    id: int
    owner_id: int
    polygon: dict  # GeoJSON
    area: float
    updated_at: datetime