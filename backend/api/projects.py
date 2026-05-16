from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from db.session import get_db
from models.core_models import User, Project, TenantMember
from schemas.project_schemas import ProjectCreate, ProjectUpdate, ProjectResponse
from api.deps import get_current_user

router = APIRouter()

# Helper function to ensure we always get the user's workspace
def get_tenant_membership(db: Session, user_id: str):
    membership = db.query(TenantMember).filter(TenantMember.user_id == user_id).first()
    if not membership:
        raise HTTPException(status_code=403, detail="User does not belong to any workspace.")
    return membership


@router.post("/", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(
    project_in: ProjectCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    membership = get_tenant_membership(db, current_user.id)
    
    new_project = Project(
        name=project_in.name,
        description=project_in.description,
        tenant_id=membership.tenant_id,
        created_by_id=current_user.id
    )
    
    db.add(new_project)
    db.commit()
    db.refresh(new_project)
    return new_project


@router.get("/", response_model=List[ProjectResponse])
def get_projects(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    membership = get_tenant_membership(db, current_user.id)
    projects = db.query(Project).filter(Project.tenant_id == membership.tenant_id).all()
    return projects


@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(
    project_id: str, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    membership = get_tenant_membership(db, current_user.id)
    project = db.query(Project).filter(Project.id == project_id, Project.tenant_id == membership.tenant_id).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.patch("/{project_id}", response_model=ProjectResponse)
def update_project(
    project_id: str, 
    project_in: ProjectUpdate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    membership = get_tenant_membership(db, current_user.id)
    project = db.query(Project).filter(Project.id == project_id, Project.tenant_id == membership.tenant_id).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Update only the fields provided
    if project_in.name is not None:
        project.name = project_in.name
    if project_in.description is not None:
        project.description = project_in.description
        
    db.commit()
    db.refresh(project)
    return project


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: str, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    membership = get_tenant_membership(db, current_user.id)
    
    # Optional Security: Only allow owners or admins to delete projects
    if membership.role.value not in ["owner", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized to delete projects")
        
    project = db.query(Project).filter(Project.id == project_id, Project.tenant_id == membership.tenant_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    db.delete(project)
    db.commit()
    return None