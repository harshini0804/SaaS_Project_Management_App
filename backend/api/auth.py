from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
import uuid

from typing import List
from db.session import get_db
from models.core_models import User, Tenant, TenantMember, RoleEnum
from schemas.auth_schemas import UserCreate, Token, UserResponse
from core.security import get_password_hash, verify_password, create_access_token
from core.config import settings
from api.deps import get_current_user

router = APIRouter()

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register_user(user_in: UserCreate, db: Session = Depends(get_db)):
    # 1. Check for duplicate emails
    if db.query(User).filter(User.email == user_in.email).first():
        raise HTTPException(status_code=400, detail="A user with this email already exists.")

    # 2. Generate a URL-friendly slug for the workspace
    slug = user_in.workspace_name.lower().replace(" ", "-") + "-" + str(uuid.uuid4())[:6]

    try:
        # 3. Create the Tenant (Workspace)
        new_tenant = Tenant(name=user_in.workspace_name, slug=slug)
        db.add(new_tenant)
        db.flush() # Flush to assign new_tenant.id without committing to the DB yet

        # 4. Create the User
        hashed_pw = get_password_hash(user_in.password)
        new_user = User(email=user_in.email, hashed_password=hashed_pw)
        db.add(new_user)
        db.flush() 

        # 5. Link them together via TenantMember as the 'owner'
        new_member = TenantMember(
            tenant_id=new_tenant.id,
            user_id=new_user.id,
            role=RoleEnum.owner
        )
        db.add(new_member)
        
        # 6. Commit the entire transaction
        db.commit()
        db.refresh(new_user)
        return new_user

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Registration failed due to a database error.")

@router.post("/login", response_model=Token)
def login_user(db: Session = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()):
    # We use OAuth2PasswordRequestForm so FastAPI's auto-generated Swagger UI 'Authorize' button works
    
    # 1. Find user by email (OAuth2 maps 'username' field to our email)
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user:
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    
    # 2. Verify password hash
    if not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect email or password")

    # 3. Generate JWT
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        subject=user.id, expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserResponse)
def read_current_user(current_user: User = Depends(get_current_user)):
    """
    Test endpoint to verify the token works. 
    It requires a valid JWT and returns the user's profile.
    """
    return current_user

@router.get("/users", response_model=List[UserResponse])
def get_all_users(db: Session = Depends(get_db)):
    """
    Utility endpoint to view all registered users in the database.
    """
    users = db.query(User).all()
    return users