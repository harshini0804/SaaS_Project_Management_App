from pydantic import BaseModel, EmailStr

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    workspace_name: str  # Required to scaffold the Tenant

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    user_id: str | None = None

class UserResponse(BaseModel):
    id: str
    email: EmailStr
    is_active: bool

    class Config:
        from_attributes = True