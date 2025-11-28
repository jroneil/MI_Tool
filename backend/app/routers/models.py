from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ..dependencies import get_current_user
from ..db import get_session
from ..models import Model, Field, Membership
from ..schemas import ModelCreate, ModelRead

router = APIRouter(prefix="/models", tags=["models"])


@router.post("/", response_model=ModelRead)
async def create_model(
    payload: ModelCreate,
    session: AsyncSession = Depends(get_session),
    current_user=Depends(get_current_user),
):
    membership = await session.execute(
        select(Membership).where(
            Membership.user_id == current_user.id,
            Membership.organization_id == payload.organization_id,
        )
    )
    if not membership.scalars().first():
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a member of workspace")

    model = Model(
        organization_id=payload.organization_id,
        name=payload.name,
        slug=payload.slug,
        description=payload.description,
    )
    session.add(model)
    await session.flush()

    for field in payload.fields:
        session.add(
            Field(
                model_id=model.id,
                name=field.name,
                key=field.key,
                field_type=field.field_type,
                required=field.required,
                options=field.options,
            )
        )
    await session.commit()
    await session.refresh(model)
    await session.refresh(model, attribute_names=["fields"])
    return model


@router.get("/{organization_id}", response_model=list[ModelRead])
async def list_models(
    organization_id: int,
    session: AsyncSession = Depends(get_session),
    current_user=Depends(get_current_user),
):
    membership = await session.execute(
        select(Membership).where(
            Membership.user_id == current_user.id, Membership.organization_id == organization_id
        )
    )
    if not membership.scalars().first():
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a member of workspace")

    result = await session.execute(select(Model).where(Model.organization_id == organization_id))
    return result.scalars().all()
