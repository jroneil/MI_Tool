from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from ..dependencies import get_current_user
from ..db import get_session
from ..models import Workspace, WorkspaceMember
from ..schemas import WorkspaceCreate, WorkspaceRead, WorkspaceMembershipRead

router = APIRouter(prefix="/workspaces", tags=["workspaces"])
legacy_router = APIRouter(prefix="/organizations", tags=["organizations"], include_in_schema=False)


@router.get("/me", response_model=list[WorkspaceMembershipRead])
@legacy_router.get("/me", response_model=list[WorkspaceMembershipRead])
async def list_memberships(
    session: AsyncSession = Depends(get_session),
    current_user=Depends(get_current_user),
):
    result = await session.execute(
        select(WorkspaceMember).where(WorkspaceMember.user_id == current_user.id)
    )
    memberships = result.scalars().all()
    for membership in memberships:
        await session.refresh(membership, attribute_names=["workspace"])
    return memberships


@router.post("/", response_model=WorkspaceRead, status_code=status.HTTP_201_CREATED)
@legacy_router.post("/", response_model=WorkspaceRead, status_code=status.HTTP_201_CREATED)
async def create_workspace(
    payload: WorkspaceCreate,
    session: AsyncSession = Depends(get_session),
    current_user=Depends(get_current_user),
):
    existing = await session.execute(select(Workspace).where(Workspace.name == payload.name))
    if existing.scalars().first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Workspace name already exists")

    workspace = Workspace(name=payload.name, created_by=current_user.id)
    session.add(workspace)
    await session.flush()
    membership = WorkspaceMember(user_id=current_user.id, workspace_id=workspace.id, role="owner")
    session.add(membership)
    await session.commit()
    await session.refresh(workspace)
    return workspace
