from pydantic import BaseModel
from typing import List
from pydantic import EmailStr
from datetime import datetime

class WorkspaceUpdate(BaseModel):
    name: str

class TeamMemberResponse(BaseModel):
    id: str
    email: str
    role: str

class WorkspaceResponse(BaseModel):
    id: str
    name: str
    slug: str
    subscription_plan: str = "free"
    members: List[TeamMemberResponse]


class InviteCreate(BaseModel):
    email: EmailStr
    role: str = "member"

class InviteResponse(BaseModel):
    invite_link: str
    expires_at: datetime

    class Config:
        from_attributes = True

        