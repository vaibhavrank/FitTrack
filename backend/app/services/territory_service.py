from sqlalchemy.orm import Session
from sqlalchemy import func
from geoalchemy2 import WKTElement
from datetime import datetime
from typing import List, Optional
from app.models.territory import Territory
from app.models.location_point import LocationPoint

class TerritoryService:
    @staticmethod
    def process_activity_completion(db: Session, session_id: int, user_id: int):
        points = db.query(LocationPoint).filter(
            LocationPoint.session_id == session_id
        ).order_by(LocationPoint.timestamp).all()

        if len(points) < 3:
            return  # Not enough points for a polygon

        # Check if it's a loop (start and end close)
        start = points[0]
        end = points[-1]
        loop_distance = TerritoryService._haversine_distance(
            start.latitude, start.longitude, end.latitude, end.longitude
        )

        if loop_distance < 0.1:  # Within 100m
            TerritoryService._capture_territory(db, points, user_id)
        else:
            TerritoryService._expand_territory(db, points, user_id)

    @staticmethod
    def _capture_territory(db: Session, points: List[LocationPoint], user_id: int):
        # Create polygon from points
        coords = [(p.longitude, p.latitude) for p in points]
        coords.append(coords[0])  # Close the polygon
        wkt = f"POLYGON(({', '.join(f'{lon} {lat}' for lon, lat in coords)}))"

        # Validate and get area
        polygon_geom = func.ST_GeomFromText(wkt, 4326)
        is_valid = db.query(func.ST_IsValid(polygon_geom)).scalar()
        if not is_valid:
            return

        area = db.query(func.ST_Area(func.ST_Transform(polygon_geom, 3857))).scalar()  # Area in square meters

        # Check for conflicts
        new_polygon = TerritoryService._resolve_conflicts(db, polygon_geom, user_id)

        # Merge with existing territory
        existing = db.query(Territory).filter(Territory.owner_id == user_id).first()
        if existing:
            merged = func.ST_Union(existing.polygon, new_polygon)
            existing.polygon = merged
            existing.area = db.query(func.ST_Area(func.ST_Transform(merged, 3857))).scalar()
            existing.updated_at = datetime.utcnow()
        else:
            territory = Territory(
                owner_id=user_id,
                polygon=new_polygon,
                area=area,
                updated_at=datetime.utcnow()
            )
            db.add(territory)

        db.commit()

    @staticmethod
    def _expand_territory(db: Session, points: List[LocationPoint], user_id: int):
        # Check if start/end near border
        existing = db.query(Territory).filter(Territory.owner_id == user_id).first()
        if not existing:
            return

        start = points[0]
        end = points[-1]
        start_point = func.ST_GeomFromText(f'POINT({start.longitude} {start.latitude})', 4326)
        end_point = func.ST_GeomFromText(f'POINT({end.longitude} {end.latitude})', 4326)

        # Check if start or end is near border (within 50m)
        near_border = db.query(func.ST_DWithin(func.ST_Boundary(existing.polygon), start_point, 0.0005)).scalar() or \
                      db.query(func.ST_DWithin(func.ST_Boundary(existing.polygon), end_point, 0.0005)).scalar()

        if near_border:
            # Create expansion polygon (simplified as buffer around path)
            coords = [(p.longitude, p.latitude) for p in points]
            line_wkt = f"LINESTRING({', '.join(f'{lon} {lat}' for lon, lat in coords)})"
            line_geom = func.ST_GeomFromText(line_wkt, 4326)
            expansion = func.ST_Buffer(line_geom, 0.001)  # ~100m buffer

            # Resolve conflicts
            expansion = TerritoryService._resolve_conflicts(db, expansion, user_id)

            # Merge
            merged = func.ST_Union(existing.polygon, expansion)
            existing.polygon = merged
            existing.area = db.query(func.ST_Area(func.ST_Transform(merged, 3857))).scalar()
            existing.updated_at = datetime.utcnow()
            db.commit()

    @staticmethod
    def _resolve_conflicts(db: Session, new_geom, user_id: int):
        # Find intersecting territories from other users
        conflicts = db.query(Territory).filter(
            Territory.owner_id != user_id,
            func.ST_Intersects(Territory.polygon, new_geom)
        ).all()

        for conflict in conflicts:
            # Subtract conflicting area
            new_geom = func.ST_Difference(new_geom, conflict.polygon)

        return new_geom

    @staticmethod
    def get_territories_in_bbox(db: Session, min_lon: float, min_lat: float, max_lon: float, max_lat: float):
        bbox = func.ST_MakeEnvelope(min_lon, min_lat, max_lon, max_lat, 4326)
        territories = db.query(Territory).filter(
            func.ST_Intersects(Territory.polygon, bbox)
        ).all()
        print("Found territories:", len(territories))
        return territories

    @staticmethod
    def get_all_territories(db: Session):
        return db.query(Territory).all()

    @staticmethod
    def claim_territory(db: Session, polygon_coords: list[list[float]], user_id: int):
        if not polygon_coords or len(polygon_coords) < 3:
            return None

        # convert from [lat, lng] to WKT lon lat
        coords = []
        for point in polygon_coords:
            if len(point) < 2:
                continue
            lat, lon = point[0], point[1]
            coords.append((lon, lat))
        if len(coords) < 3:
            return None

        # ensure polygon is closed
        if coords[0] != coords[-1]:
            coords.append(coords[0])

        polygon_wkt = f"POLYGON(({', '.join(f'{lon} {lat}' for lon, lat in coords)}))"
        polygon_geom = func.ST_GeomFromText(polygon_wkt, 4326)

        is_valid = db.query(func.ST_IsValid(polygon_geom)).scalar()
        if not is_valid:
            return None

        # Resolve conflicts, similar to capture
        new_geom = TerritoryService._resolve_conflicts(db, polygon_geom, user_id)

        existing = db.query(Territory).filter(Territory.owner_id == user_id).first()
        if existing:
            merged = func.ST_Union(existing.polygon, new_geom)
            existing.polygon = merged
            existing.area = db.query(func.ST_Area(func.ST_Transform(merged, 3857))).scalar()
            existing.updated_at = datetime.utcnow()
            db.commit()
            return existing

        area = db.query(func.ST_Area(func.ST_Transform(new_geom, 3857))).scalar()
        territory = Territory(
            owner_id=user_id,
            polygon=new_geom,
            area=area,
            updated_at=datetime.utcnow(),
        )
        db.add(territory)
        db.commit()
        db.refresh(territory)
        return territory

    @staticmethod
    def _haversine_distance(lat1, lon1, lat2, lon2):
        from math import radians, cos, sin, asin, sqrt
        R = 6371
        dlat = radians(lat2 - lat1)
        dlon = radians(lon2 - lon1)
        a = sin(dlat/2)**2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon/2)**2
        c = 2 * asin(sqrt(a))
        return R * c