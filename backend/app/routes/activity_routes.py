from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.config.database import get_db
from app.routes.auth_routes import get_current_user
from app.services.activity_service import ActivityService
from app.services.territory_service import TerritoryService
from app.schemas.activity_schema import StartActivityRequest, LocationUpdate, EndActivityRequest, ActivitySessionResponse
from app.models.activity_session import ActivitySession

router = APIRouter(prefix="/activity", tags=["Activity"])

@router.post("/start", response_model=ActivitySessionResponse)
def start_activity(
    request: StartActivityRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    session = ActivityService.start_activity(db, current_user.id, request.activity_type)
    return ActivitySessionResponse(
        id=session.id,
        user_id=session.user_id,
        activity_type=session.activity_type,
        start_time=session.start_time,
        end_time=session.end_time,
        total_distance=session.total_distance,
        status=session.status
    )

@router.post("/location")
def add_location(
    location: LocationUpdate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verify session belongs to user
    session = db.query(ActivitySession).filter(
        ActivitySession.id == location.session_id,
        ActivitySession.user_id == current_user.id,
        ActivitySession.status == "active"
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Active session not found")

    success = ActivityService.add_location(db, location)
    if not success:
        raise HTTPException(status_code=400, detail="Invalid location data")

    return {"message": "Location added"}

@router.post("/end", response_model=ActivitySessionResponse)
def end_activity(
    request: EndActivityRequest,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    session = ActivityService.end_activity(db, request.session_id, current_user.id)
    if not session:
        raise HTTPException(status_code=404, detail="Active session not found")

    # Process territory capture/expansion
    TerritoryService.process_activity_completion(db, request.session_id, current_user.id)

    return ActivitySessionResponse(
        id=session.id,
        user_id=session.user_id,
        activity_type=session.activity_type,
        start_time=session.start_time,
        end_time=session.end_time,
        total_distance=session.total_distance,
        status=session.status
    )