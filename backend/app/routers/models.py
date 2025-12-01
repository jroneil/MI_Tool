from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ..dependencies import get_current_user
from ..db import get_session
from ..models import Model, ModelField, WorkspaceMember
from ..schemas import ModelCreate, ModelRead

router = APIRouter(prefix="/models", tags=["models"])


@router.post("/", response_model=ModelRead)
async def create_model(
    payload: ModelCreate,
    session: AsyncSession = Depends(get_session),
    current_user=Depends(get_current_user),
):
    membership = await session.execute(
        select(WorkspaceMember).where(
            WorkspaceMember.user_id == current_user.id,
            WorkspaceMember.workspace_id == payload.workspace_id,
        )
    )
    if not membership.scalars().first():
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a member of workspace")

    model = Model(
        workspace_id=payload.workspace_id,
        name=payload.name,
        slug=payload.slug,
        description=payload.description,
        created_by=current_user.id,
    )
    session.add(model)
    await session.flush()

    for field in payload.fields:
        session.add(
            ModelField(
                model_id=model.id,
                name=field.name,
                slug=field.slug,
                data_type=field.data_type,
                is_required=field.is_required,
                is_unique=field.is_unique,
                position=field.position,
                config=field.config,
            )
        )
    await session.commit()
    await session.refresh(model)
    await session.refresh(model, attribute_names=["fields"])
    return model


@router.get("/", response_model=list[ModelRead])
async def list_models(
    workspace_id: int = Query(..., description="Workspace to list models for"),
    session: AsyncSession = Depends(get_session),
    current_user=Depends(get_current_user),
):
    membership = await session.execute(
        select(WorkspaceMember).where(
            WorkspaceMember.user_id == current_user.id, WorkspaceMember.workspace_id == workspace_id
        )
    )
    if not membership.scalars().first():
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a member of workspace")

    result = await session.execute(
        select(Model)
        .where(Model.workspace_id == workspace_id)
        .order_by(Model.created_at.desc())
    )
    models = result.scalars().unique().all()
    for model in models:
        await session.refresh(model, attribute_names=["fields"])
    return models


@router.get("/{model_id}", response_model=ModelRead)
async def get_model(
    model_id: int,
    session: AsyncSession = Depends(get_session),
    current_user=Depends(get_current_user),
):
    model_result = await session.execute(select(Model).where(Model.id == model_id))
    model = model_result.scalars().first()
    if not model:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Model not found")

    membership = await session.execute(
        select(WorkspaceMember).where(
            WorkspaceMember.user_id == current_user.id,
            WorkspaceMember.workspace_id == model.workspace_id,
        )
    )
    if not membership.scalars().first():
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a member of workspace")

    await session.refresh(model, attribute_names=["fields"])
    return model
