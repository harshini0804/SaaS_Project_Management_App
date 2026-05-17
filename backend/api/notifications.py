from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from db.session import get_db
from models.core_models import User, Notification
from schemas.notification_schemas import NotificationResponse
from api.deps import get_current_user

router = APIRouter()

# Helper function to be imported by other routers (like tasks.py)
def create_notification(db: Session, user_id: str, message: str, action_link: str = None):
    new_notif = Notification(
        user_id=user_id,
        message=message,
        action_link=action_link
    )
    db.add(new_notif)
    # Note: We don't call db.commit() here so it can be batched with the parent transaction

@router.get("/", response_model=List[NotificationResponse])
def get_unread_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Fetch top 20 newest unread notifications
    notifications = (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id, Notification.is_read == False)
        .order_by(Notification.created_at.desc())
        .limit(20)
        .all()
    )
    return notifications

@router.patch("/mark-read", status_code=status.HTTP_200_OK)
def mark_all_as_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db.query(Notification).filter(
        Notification.user_id == current_user.id, 
        Notification.is_read == False
    ).update({"is_read": True})
    
    db.commit()
    return {"message": "All notifications marked as read"}