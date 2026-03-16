from sqlalchemy import Column, Integer, Float, DateTime
from geoalchemy2 import Geometry
from app.config.database import Base

class LocationPoint(Base):
    __tablename__ = "location_points"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, index=True)
    latitude = Column(Float)
    longitude = Column(Float)
    accuracy = Column(Float)
    speed = Column(Float, nullable=True)
    timestamp = Column(DateTime)
    geom = Column(Geometry('POINT', srid=4326))