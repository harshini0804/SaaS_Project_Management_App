from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    status: Optional[str] = "To Do"
    project_id: str
    assignee_id: Optional[str] = None

class TaskMove(BaseModel):
    status: str
    position: int

class TaskResponse(BaseModel):
    id: str
    title: str
    description: Optional[str]
    status: str
    position: int
    project_id: str
    assignee_id: Optional[str]
    created_at: datetime

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    assignee_id: Optional[str] = None

class CommentCreate(BaseModel):
    content: str

class CommentResponse(BaseModel):
    id: str
    task_id: str
    user_id: str
    author_email: str  # We need this so the React UI can display who commented!
    content: str
    created_at: datetime

class ActivityLogResponse(BaseModel):
    id: str
    entity_type: str
    entity_id: str
    action: str
    created_at: datetime
    user_email: str


class AttachmentCreate(BaseModel):
    file_name: str
    file_path: str

class AttachmentResponse(BaseModel):
    id: str
    file_name: str
    download_url: str  # We will generate a fresh 15-minute download URL every time!
    created_at: datetime
    
    class Config:
        from_attributes = True

class PresignedUrlRequest(BaseModel):
    file_name: str
    file_type: str # e.g., "image/png", "application/pdf"