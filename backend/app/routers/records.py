from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from ..dependencies import get_current_user
from ..db import get_session
from ..models import Record, Model, Field, Membership
from ..schemas import RecordCreate, RecordRead
from ..core_config import settings

router = APIRouter(prefix="/records", tags=["records"])


async def ensure_membership(session: AsyncSession, user_id: int, organization_id: int):
    membership = await session.execute(
        select(Membership).where(
            Membership.user_id == user_id, Membership.organization_id == organization_id
        )
    )
    if not membership.scalars().first():
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a member of workspace")


@router.post("/{model_id}", response_model=RecordRead)
async def create_record(
    model_id: int,
    payload: RecordCreate,
    session: AsyncSession = Depends(get_session),
    current_user=Depends(get_current_user),
):
    model_result = await session.execute(select(Model).where(Model.id == model_id))
    model = model_result.scalars().first()
    if not model:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Model not found")

    await ensure_membership(session, current_user.id, model.organization_id)

    count_result = await session.execute(select(func.count()).select_from(Record).where(Record.model_id == model_id))
    total_records = count_result.scalar_one()
    if total_records >= settings.free_record_limit:
        raise HTTPException(status_code=status.HTTP_402_PAYMENT_REQUIRED, detail="Record limit reached. Upgrade plan")

    record = Record(model_id=model_id, created_by=current_user.id, data=payload.data)
    session.add(record)
    await session.commit()
    await session.refresh(record)
    return record


@router.get("/{model_id}", response_model=list[RecordRead])
async def list_records(
    model_id: int,
    session: AsyncSession = Depends(get_session),
    current_user=Depends(get_current_user),
):
    model_result = await session.execute(select(Model).where(Model.id == model_id))
    model = model_result.scalars().first()
    if not model:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Model not found")
    await ensure_membership(session, current_user.id, model.organization_id)
    result = await session.execute(select(Record).where(Record.model_id == model_id))
    return result.scalars().all()


@router.delete("/{record_id}")
async def delete_record(
    record_id: int,
    session: AsyncSession = Depends(get_session),
    current_user=Depends(get_current_user),
):
    record_result = await session.execute(
        select(Record).join(Model).where(Record.id == record_id, Model.id == Record.model_id)
    )
    record = record_result.scalars().first()
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Record not found")
    await ensure_membership(session, current_user.id, record.model.organization_id)
    await session.delete(record)
    await session.commit()
    return {"status": "deleted"}
