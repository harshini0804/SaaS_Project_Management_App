from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, cast, Date
from datetime import datetime, timedelta

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

    # 2. Base Query: Join Tasks to Projects to filter by current Workspace (Tenant)
    base_query = db.query(Task).join(Project, Task.project_id == Project.id).filter(Project.tenant_id == tenant_id)

    # 3. Calculate High-Level Metrics
    total_tasks = base_query.count()
    my_tasks = base_query.filter(Task.assignee_id == current_user.id, Task.status != "Done").count()
    completed_tasks = base_query.filter(Task.status == "Done").count()

    # 4. Status Distribution (Donut Chart)
    status_counts = (
        db.query(Task.status, func.count(Task.id))
        .join(Project, Task.project_id == Project.id)
        .filter(Project.tenant_id == tenant_id)
        .group_by(Task.status)
        .all()
    )
    status_distribution = [{"name": status, "value": count} for status, count in status_counts]

    # 5. Workload Distribution (Bar Chart)
    # Since the User model only has email, we split it to use the first part as a display name
    workload_query = (
        db.query(User.email, func.count(Task.id))
        .join(Task, Task.assignee_id == User.id)
        .join(Project, Task.project_id == Project.id)
        .filter(Project.tenant_id == tenant_id, Task.status != "Done")
        .group_by(User.email)
        .all()
    )
    workload_distribution = [
        {"name": email.split('@')[0].capitalize(), "tasks": count} 
        for email, count in workload_query
    ]

    # 6. Velocity Trend (Area Chart - Last 7 Days)
    velocity_trend = []
    today = datetime.utcnow().date()

    for i in range(6, -1, -1):
        target_date = today - timedelta(days=i)
        
        # Count tasks created on this specific day in this workspace
        added = (
            db.query(Task)
            .join(Project, Task.project_id == Project.id)
            .filter(Project.tenant_id == tenant_id, cast(Task.created_at, Date) == target_date)
            .count()
        )
        
        # Count tasks updated to "Done" on this specific day in this workspace
        completed = (
            db.query(Task)
            .join(Project, Task.project_id == Project.id)
            .filter(
                Project.tenant_id == tenant_id, 
                Task.status == "Done", 
                cast(Task.updated_at, Date) == target_date
            )
            .count()
        )
        
        velocity_trend.append({
            "date": target_date.strftime("%a"), # e.g., "Mon", "Tue"
            "added": added,
            "completed": completed
        })

    return {
        "total_tasks": total_tasks,
        "my_tasks": my_tasks,
        "completed_tasks": completed_tasks,
        "status_distribution": status_distribution,
        "workload_distribution": workload_distribution,
        "velocity_trend": velocity_trend
    }