from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class NotificationResponse(BaseModel):
    id: str
    message: str
    is_read: bool
    action_link: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True