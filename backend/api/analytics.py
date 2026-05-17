from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from db.session import get_db
from models.core_models import User, Project, Task, TenantMember
from api.deps import get_current_user

router = APIRouter()

@router.get("/workspace")
def get_workspace_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Verify user's workspace
    membership = db.query(TenantMember).filter(TenantMember.user_id == current_user.id).first()
    if not membership:
        raise HTTPException(status_code=404, detail="No workspace found.")

    tenant_id = membership.tenant_id

    # 2. Base Query: Join Tasks to Projects to filter by the current Workspace (Tenant)
    base_query = db.query(Task).join(Project, Task.project_id == Project.id).filter(Project.tenant_id == tenant_id)

    # 3. Calculate High-Level Metrics
    total_tasks = base_query.count()
    my_tasks = base_query.filter(Task.assignee_id == current_user.id).count()
    completed_tasks = base_query.filter(Task.status == "Done").count()

    # 4. Group By Status (using SQLAlchemy func.count)
    status_counts = (
        db.query(Task.status, func.count(Task.id))
        .join(Project, Task.project_id == Project.id)
        .filter(Project.tenant_id == tenant_id)
        .group_by(Task.status)
        .all()
    )

    # Format the data perfectly for Recharts on the frontend
    status_distribution = [{"name": status, "value": count} for status, count in status_counts]

    return {
        "total_tasks": total_tasks,
        "my_tasks": my_tasks,
        "completed_tasks": completed_tasks,
        "status_distribution": status_distribution
    }