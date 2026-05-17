from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
import boto3
import os
from botocore.exceptions import ClientError
from dotenv import load_dotenv 

from db.session import get_db
from models.core_models import User, Project, Task, TenantMember, TaskComment, ActivityLog, TaskAttachment
from schemas.task_schemas import TaskCreate, TaskResponse, TaskMove, TaskUpdate, CommentCreate, CommentResponse, ActivityLogResponse, AttachmentCreate, AttachmentResponse, PresignedUrlRequest
from api.deps import get_current_user
from api.notifications import create_notification

load_dotenv()  

AWS_BUCKET_NAME = os.getenv("AWS_BUCKET_NAME", "my-saas-attachments-bucket")
s3_client = boto3.client(
    's3',
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
    region_name=os.getenv("AWS_REGION", "us-east-1")
)   

router = APIRouter()

# Helper function to verify project access
def verify_project_access(db: Session, user_id: str, project_id: str, require_write: bool = False):
    membership = db.query(TenantMember).filter(TenantMember.user_id == user_id).first()
    if not membership:
        raise HTTPException(status_code=403, detail="User not in a workspace.")
    
    if require_write and membership.role.name == "viewer":
        raise HTTPException(status_code=403, detail="Viewers are read-only and cannot perform this action.")
    
    project = db.query(Project).filter(Project.id == project_id, Project.tenant_id == membership.tenant_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found or access denied.")
    return project

def log_activity(db: Session, tenant_id: str, user_id: str, entity_type: str, entity_id: str, action: str):
    log = ActivityLog(
        tenant_id=tenant_id,
        user_id=user_id,
        entity_type=entity_type,
        entity_id=entity_id,
        action=action
    )
    db.add(log)

@router.post("/", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
def create_task(
    task_in: TaskCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    verify_project_access(db, current_user.id, task_in.project_id,require_write=True)

    max_position = db.query(func.max(Task.position)).filter(
        Task.project_id == task_in.project_id,
        Task.status == task_in.status
    ).scalar()
    
    new_position = 0 if max_position is None else max_position + 1

    new_task = Task(
        title=task_in.title,
        description=task_in.description,
        status=task_in.status,
        position=new_position,
        project_id=task_in.project_id,
        assignee_id=task_in.assignee_id
    )
    
    db.add(new_task)
    
    # --- NOTIFICATION TRIGGER: Task Created & Assigned ---
    if task_in.assignee_id and task_in.assignee_id != current_user.id:
        create_notification(
            db, 
            user_id=task_in.assignee_id, 
            message=f"{current_user.email} assigned you a new task: {task_in.title}",
            action_link=f"/projects/{task_in.project_id}"
        )
    # -----------------------------------------------------
        
    db.commit()
    project = db.query(Project).filter(Project.id == task_in.project_id).first()
    log_activity(db, project.tenant_id, current_user.id, "task", new_task.id, "created this task")
    db.refresh(new_task)
    return new_task

@router.get("/project/{project_id}", response_model=List[TaskResponse])
def get_project_tasks(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    verify_project_access(db, current_user.id, project_id)
    tasks = db.query(Task).filter(Task.project_id == project_id).order_by(Task.status, Task.position).all()
    return tasks

@router.patch("/{task_id}/move", response_model=TaskResponse)
def move_task(
    task_id: str,
    task_move: TaskMove,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")
    
    verify_project_access(db, current_user.id, task.project_id,require_write=True)

    old_status = task.status
    task.status = task_move.status
    task.position = task_move.position

    # --- NOTIFICATION TRIGGER: Task Moved ---
    if task.assignee_id and task.assignee_id != current_user.id and old_status != task_move.status:
        create_notification(
            db, 
            user_id=task.assignee_id, 
            message=f"{current_user.email} moved your task '{task.title}' to {task_move.status}",
            action_link=f"/projects/{task.project_id}"
        )
    # ----------------------------------------

    project = db.query(Project).filter(Project.id == task.project_id).first()
    log_activity(db, project.tenant_id, current_user.id, "task", task.id, f"moved this task to {task_move.status}")
    db.commit()
    db.refresh(task)
    
    return task

@router.patch("/{task_id}", response_model=TaskResponse)
def update_task_details(
    task_id: str,
    task_update: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")

    verify_project_access(db, current_user.id, task.project_id,require_write=True)

    old_assignee = task.assignee_id
    
    if task_update.title is not None:
        task.title = task_update.title
    if task_update.description is not None:
        task.description = task_update.description
    if task_update.assignee_id is not None:
        task.assignee_id = task_update.assignee_id

    # --- NOTIFICATION TRIGGER: Task Re-Assigned ---
    if task_update.assignee_id and task_update.assignee_id != old_assignee and task_update.assignee_id != current_user.id:
        create_notification(
            db, 
            user_id=task_update.assignee_id, 
            message=f"{current_user.email} assigned you a task: {task.title}",
            action_link=f"/projects/{task.project_id}"
        )
    # ----------------------------------------------

    project = db.query(Project).filter(Project.id == task.project_id).first()
    log_activity(db, project.tenant_id, current_user.id, "task", task.id, "updated the task details")
    db.commit()
    db.refresh(task)
    return task


@router.post("/{task_id}/comments", response_model=CommentResponse)
def add_task_comment(
    task_id: str,
    comment_in: CommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")

    verify_project_access(db, current_user.id, task.project_id,require_write=True)

    new_comment = TaskComment(
        task_id=task_id,
        user_id=current_user.id,
        content=comment_in.content
    )
    db.add(new_comment)
    
    # --- NOTIFICATION TRIGGER: New Comment ---
    # Only notify the assignee if they are NOT the one writing the comment
    if task.assignee_id and task.assignee_id != current_user.id:
        create_notification(
            db, 
            user_id=task.assignee_id, 
            message=f"{current_user.email} commented on your task: '{task.title}'",
            action_link=f"/projects/{task.project_id}"
        )
    # -------------------------------------------
    
    db.commit()
    db.refresh(new_comment)

    return CommentResponse(
        id=new_comment.id,
        task_id=new_comment.task_id,
        user_id=new_comment.user_id,
        author_email=current_user.email,
        content=new_comment.content,
        created_at=new_comment.created_at
    )


@router.get("/{task_id}/comments", response_model=List[CommentResponse])
def get_task_comments(
    task_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")

    verify_project_access(db, current_user.id, task.project_id)

    comments_query = (
        db.query(TaskComment, User.email.label("author_email"))
        .join(User, TaskComment.user_id == User.id)
        .filter(TaskComment.task_id == task_id)
        .order_by(TaskComment.created_at.asc())
        .all()
    )

    formatted_comments = [
        CommentResponse(
            id=record.TaskComment.id,
            task_id=record.TaskComment.task_id,
            user_id=record.TaskComment.user_id,
            author_email=record.author_email,
            content=record.TaskComment.content,
            created_at=record.TaskComment.created_at
        )
        for record in comments_query
    ]

    return formatted_comments


@router.get("/{task_id}/activity", response_model=List[ActivityLogResponse])
def get_task_activity(
    task_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")

    verify_project_access(db, current_user.id, task.project_id)

    activity_query = (
        db.query(ActivityLog, User.email.label("user_email"))
        .join(User, ActivityLog.user_id == User.id)
        .filter(ActivityLog.entity_type == "task", ActivityLog.entity_id == task_id)
        .order_by(ActivityLog.created_at.desc())
        .all()
    )

    formatted_activity = [
        ActivityLogResponse(
            id=record.ActivityLog.id,
            entity_type=record.ActivityLog.entity_type,
            entity_id=record.ActivityLog.entity_id,
            action=record.ActivityLog.action,
            created_at=record.ActivityLog.created_at,
            user_email=record.user_email
        )
        for record in activity_query
    ]

    return formatted_activity


@router.post("/{task_id}/attachments/presigned-url")
def generate_presigned_url(
    task_id: str,
    request_in: PresignedUrlRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")

    project = verify_project_access(db, current_user.id, task.project_id,require_write=True)

    s3_key = f"{project.tenant_id}/{task_id}/{request_in.file_name}"

    try:
        presigned_url = s3_client.generate_presigned_url(
            'put_object',
            Params={
                'Bucket': AWS_BUCKET_NAME,
                'Key': s3_key,
                'ContentType': request_in.file_type
            },
            ExpiresIn=3600
        )
        return {"upload_url": presigned_url, "file_path": s3_key}
    except ClientError as e:
        raise HTTPException(status_code=500, detail="Could not generate upload URL.")


@router.post("/{task_id}/attachments", response_model=AttachmentResponse)
def save_attachment_record(
    task_id: str,
    attachment_in: AttachmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")

    project = verify_project_access(db, current_user.id, task.project_id,require_write=True)

    new_attachment = TaskAttachment(
        task_id=task_id,
        user_id=current_user.id,
        file_name=attachment_in.file_name,
        file_path=attachment_in.file_path
    )
    db.add(new_attachment)
    
    log_activity(db, project.tenant_id, current_user.id, "task", task_id, f"attached a file: {attachment_in.file_name}")
    db.commit()
    db.refresh(new_attachment)

    return AttachmentResponse(
        id=new_attachment.id,
        file_name=new_attachment.file_name,
        download_url="", 
        created_at=new_attachment.created_at
    )


@router.get("/{task_id}/attachments", response_model=List[AttachmentResponse])
def get_task_attachments(
    task_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")

    verify_project_access(db, current_user.id, task.project_id)

    attachments = db.query(TaskAttachment).filter(TaskAttachment.task_id == task_id).all()
    
    response_data = []
    for att in attachments:
        try:
            download_url = s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': AWS_BUCKET_NAME, 'Key': att.file_path},
                ExpiresIn=900 
            )
            
            response_data.append(
                AttachmentResponse(
                    id=att.id,
                    file_name=att.file_name,
                    download_url=download_url,
                    created_at=att.created_at
                )
            )
        except ClientError:
            continue

    return response_data