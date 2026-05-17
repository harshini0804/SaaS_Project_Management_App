from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
import uuid

from db.session import get_db
from models.core_models import User, Tenant, TenantMember
from schemas.workspace_schemas import WorkspaceUpdate, WorkspaceResponse, TeamMemberResponse,InviteCreate, InviteResponse
from models.core_models import WorkspaceInvite, RoleEnum
from api.deps import get_current_user

router = APIRouter()

@router.get("/me", response_model=WorkspaceResponse)
def get_my_workspace(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Find the user's workspace link
    membership = db.query(TenantMember).filter(TenantMember.user_id == current_user.id).first()
    if not membership:
        raise HTTPException(status_code=404, detail="You do not belong to any workspace.")

    # 2. Fetch the actual Tenant
    tenant = db.query(Tenant).filter(Tenant.id == membership.tenant_id).first()

    # 3. Fetch all team members in this workspace using a JOIN
    members_query = (
        db.query(TenantMember.role, User.id, User.email)
        .join(User, TenantMember.user_id == User.id)
        .filter(TenantMember.tenant_id == tenant.id)
        .all()
    )

    # 4. Format the response
    formatted_members = [
        TeamMemberResponse(id=m.id, email=m.email, role=m.role.value)
        for m in members_query
    ]

    return WorkspaceResponse(
        id=tenant.id,
        name=tenant.name,
        slug=tenant.slug,
        members=formatted_members
    )

@router.patch("/me", response_model=WorkspaceResponse)
def update_my_workspace(
    workspace_in: WorkspaceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Verify user is an owner/admin
    membership = db.query(TenantMember).filter(TenantMember.user_id == current_user.id).first()
    if not membership or membership.role.value not in ["owner", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized to update workspace settings.")

    # 2. Fetch and update the Tenant
    tenant = db.query(Tenant).filter(Tenant.id == membership.tenant_id).first()
    tenant.name = workspace_in.name
    
    # Update the slug automatically based on the new name
    # Keeping the unique UUID tail from the original creation
    unique_tail = tenant.slug.split("-")[-1]
    new_slug = workspace_in.name.lower().replace(" ", "-") + "-" + unique_tail
    tenant.slug = new_slug

    db.commit()
    db.refresh(tenant)

    # 3. Re-fetch members to return the full standard response
    return get_my_workspace(db=db, current_user=current_user)


@router.post("/invites", response_model=InviteResponse)
def create_invitation_link(
    invite_in: InviteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Verify user is an owner or admin
    membership = db.query(TenantMember).filter(TenantMember.user_id == current_user.id).first()
    if not membership or membership.role.value not in ["owner", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized to invite members.")

    # 2. Check if the user is already in the workspace
    target_user = db.query(User).filter(User.email == invite_in.email).first()
    if target_user:
        existing_member = db.query(TenantMember).filter(
            TenantMember.tenant_id == membership.tenant_id,
            TenantMember.user_id == target_user.id
        ).first()
        if existing_member:
            raise HTTPException(status_code=400, detail="User is already in this workspace.")

    # 3. Create the invitation token (Expires in 7 days)
    expiry = datetime.now(timezone.utc) + timedelta(days=7)
    new_invite = WorkspaceInvite(
        tenant_id=membership.tenant_id,
        email=invite_in.email,
        role=invite_in.role,
        expires_at=expiry
    )
    db.add(new_invite)
    db.commit()
    db.refresh(new_invite)

    # 4. Generate the frontend URL that the user will click
    # This points to your React app, not the backend API!
    frontend_link = f"http://localhost:5173/join/{new_invite.token}"

    return InviteResponse(invite_link=frontend_link, expires_at=new_invite.expires_at)


@router.post("/join/{token}")
def accept_invitation(
    token: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Find the token
    invite = db.query(WorkspaceInvite).filter(WorkspaceInvite.token == token).first()
    if not invite:
        raise HTTPException(status_code=404, detail="Invalid invitation token.")

    # 2. Check if expired
    if datetime.now(timezone.utc) > invite.expires_at:
        db.delete(invite)
        db.commit()
        raise HTTPException(status_code=400, detail="This invitation has expired.")

    # 3. Verify the logged-in user's email matches the invited email
    if current_user.email != invite.email:
        raise HTTPException(status_code=403, detail="This invitation was sent to a different email address.")

    # 4. THE FIX: Find ANY existing workspace this user is tied to (like their default registration workspace)
    existing_membership = db.query(TenantMember).filter(TenantMember.user_id == current_user.id).first()
    
    if existing_membership:
        # Overwrite their default empty workspace with the team workspace!
        existing_membership.tenant_id = invite.tenant_id
        existing_membership.role = RoleEnum[invite.role]
    else:
        # Fallback if they somehow have no workspace at all
        new_member = TenantMember(
            tenant_id=invite.tenant_id,
            user_id=current_user.id,
            role=RoleEnum[invite.role] 
        )
        db.add(new_member)
    
    # 5. Delete the token so it cannot be used again
    db.delete(invite)
    db.commit()

    return {"message": "Successfully joined the workspace!"}

@router.delete("/members/{user_id}", status_code=status.HTTP_200_OK)
def remove_workspace_member(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Verify current user is an owner/admin
    current_membership = db.query(TenantMember).filter(TenantMember.user_id == current_user.id).first()
    if not current_membership or current_membership.role.value not in ["owner", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized to remove members.")

    # 2. Prevent the user from removing themselves
    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="You cannot remove yourself.")

    # 3. Find the member to remove
    member_to_remove = db.query(TenantMember).filter(
        TenantMember.tenant_id == current_membership.tenant_id,
        TenantMember.user_id == user_id
    ).first()

    if not member_to_remove:
        raise HTTPException(status_code=404, detail="User is not in this workspace.")

    # 4. Remove them!
    db.delete(member_to_remove)
    db.commit()
    return {"message": "Member removed successfully"}