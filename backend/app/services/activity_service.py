from sqlalchemy.orm import Session
from sqlalchemy import func
from geoalchemy2 import WKTElement
from datetime import datetime, timedelta
from typing import List, Optional
from app.models.activity_session import ActivitySession, ActivityType
from app.models.location_point import LocationPoint
from app.schemas.activity_schema import LocationUpdate

class ActivityService:
    @staticmethod
    def start_activity(db: Session, user_id: int, activity_type: ActivityType) -> ActivitySession:
        session = ActivitySession(
            user_id=user_id,
            activity_type=activity_type,
            start_time=datetime.utcnow(),
            status="active"
        )
        db.add(session)
        db.commit()
        db.refresh(session)
        return session

    @staticmethod
    def add_location(db: Session, location: LocationUpdate) -> bool:
        # Fake GPS detection
        if not ActivityService._is_valid_location(db, location):
            return False

        point = LocationPoint(
            session_id=location.session_id,
            latitude=location.latitude,
            longitude=location.longitude,
            accuracy=location.accuracy,
            speed=location.speed,
            timestamp=location.timestamp,
            geom=WKTElement(f'POINT({location.longitude} {location.latitude})', srid=4326)
        )
        db.add(point)
        db.commit()
        return True

    @staticmethod
    def end_activity(db: Session, session_id: int, user_id: int) -> Optional[ActivitySession]:
        session = db.query(ActivitySession).filter(
            ActivitySession.id == session_id,
            ActivitySession.user_id == user_id,
            ActivitySession.status == "active"
        ).first()
        if not session:
            return None

        # Calculate total distance
        points = db.query(LocationPoint).filter(LocationPoint.session_id == session_id).order_by(LocationPoint.timestamp).all()
        total_distance = ActivityService._calculate_distance(points)

        session.end_time = datetime.utcnow()
        session.total_distance = total_distance
        session.status = "completed"
        db.commit()
        db.refresh(session)
        return session

    @staticmethod
    def _is_valid_location(db: Session, location: LocationUpdate) -> bool:
        # Check accuracy
        if location.accuracy > 50:  # Poor accuracy
            return False

        # Get last point
        last_point = db.query(LocationPoint).filter(
            LocationPoint.session_id == location.session_id
        ).order_by(LocationPoint.timestamp.desc()).first()

        if last_point:
            # Calculate distance and time
            distance = ActivityService._haversine_distance(
                last_point.latitude, last_point.longitude,
                location.latitude, location.longitude
            )
            time_diff = (location.timestamp - last_point.timestamp).total_seconds()

            if time_diff > 0:
                speed = distance / time_diff * 3600  # km/h
                # Unrealistic speed (> 50 km/h for walk/run, > 100 km/h for cycle)
                max_speed = 100 if last_point.speed and last_point.speed > 20 else 50
                if speed > max_speed:
                    return False

            # Sudden large jumps (> 1km in 10 seconds)
            if distance > 1.0 and time_diff < 10:
                return False

        return True

    @staticmethod
    def _haversine_distance(lat1, lon1, lat2, lon2):
        from math import radians, cos, sin, asin, sqrt
        R = 6371  # Earth radius in km
        dlat = radians(lat2 - lat1)
        dlon = radians(lon2 - lon1)
        a = sin(dlat/2)**2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon/2)**2
        c = 2 * asin(sqrt(a))
        return R * c

    @staticmethod
    def _calculate_distance(points: List[LocationPoint]) -> float:
        total = 0.0
        for i in range(1, len(points)):
            total += ActivityService._haversine_distance(
                points[i-1].latitude, points[i-1].longitude,
                points[i].latitude, points[i].longitude
            )
        return total