from sqlalchemy import Column, Integer, Float, DateTime
from geoalchemy2 import Geometry
from app.config.database import Base

class Territory(Base):
    __tablename__ = "territories"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, index=True)
    polygon = Column(Geometry('POLYGON', srid=4326))
    area = Column(Float)
    updated_at = Column(DateTime)