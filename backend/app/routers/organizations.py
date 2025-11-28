from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ..dependencies import get_current_user
from ..db import get_session
from ..models import Organization, Membership
from ..schemas import OrganizationCreate, OrganizationRead, MembershipRead

router = APIRouter(prefix="/organizations", tags=["organizations"])


@router.get("/me", response_model=list[MembershipRead])
async def list_memberships(
    session: AsyncSession = Depends(get_session),
    current_user=Depends(get_current_user),
):
    result = await session.execute(
        select(Membership).where(Membership.user_id == current_user.id).options()
    )
    memberships = result.scalars().all()
    return memberships


@router.post("/", response_model=OrganizationRead)
async def create_organization(
    payload: OrganizationCreate,
    session: AsyncSession = Depends(get_session),
    current_user=Depends(get_current_user),
):
    org = Organization(name=payload.name)
    session.add(org)
    await session.flush()
    membership = Membership(user_id=current_user.id, organization_id=org.id, role="admin")
    session.add(membership)
    await session.commit()
    await session.refresh(org)
    return org
