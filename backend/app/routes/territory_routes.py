from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
import json
from app.config.database import get_db
from app.routes.auth_routes import get_current_user
from app.services.territory_service import TerritoryService
from app.schemas.activity_schema import TerritoryResponse

router = APIRouter(prefix="/territories", tags=["Territories"])

@router.get("/", response_model=List[TerritoryResponse])
def get_territories(
    bbox: str = Query(..., description="Bounding box as min_lon,min_lat,max_lon,max_lat"),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        min_lon, min_lat, max_lon, max_lat = map(float, bbox.split(","))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid bbox format")

    territories = TerritoryService.get_territories_in_bbox(db, min_lon, min_lat, max_lon, max_lat)

    result = []
    for t in territories:
        # Convert PostGIS polygon to GeoJSON
        geojson = db.query(func.ST_AsGeoJSON(t.polygon)).scalar()
        result.append(TerritoryResponse(
            id=t.id,
            owner_id=t.owner_id,
            polygon=json.loads(geojson),
            area=t.area,
            updated_at=t.updated_at
        ))

    return result