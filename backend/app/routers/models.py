from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import delete, select
from ..dependencies import get_current_user
from ..db import get_session
from ..models import Model, ModelField, WorkspaceMember
from ..schemas import ModelCreate, ModelRead, ModelUpdate

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


@router.put("/{model_id}", response_model=ModelRead)
@router.patch("/{model_id}", response_model=ModelRead)
async def update_model(
    model_id: int,
    payload: ModelUpdate,
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

    update_data = payload.model_dump(exclude_unset=True)

    if "name" in update_data:
        model.name = update_data["name"]
    if "slug" in update_data:
        model.slug = update_data["slug"]
    if "description" in update_data:
        model.description = update_data.get("description")

    if "fields" in update_data:
        new_fields = update_data.get("fields") or []
        await session.execute(delete(ModelField).where(ModelField.model_id == model.id))
        await session.flush()
        for field in new_fields:
            if not field.name or not field.slug or not field.data_type:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Fields must include name, slug, and data_type",
                )
            session.add(
                ModelField(
                    model_id=model.id,
                    name=field.name,
                    slug=field.slug,
                    data_type=field.data_type,
                    is_required=field.is_required if field.is_required is not None else False,
                    is_unique=field.is_unique if field.is_unique is not None else False,
                    position=field.position or 0,
                    config=field.config,
                )
            )

    await session.commit()
    await session.refresh(model)
    await session.refresh(model, attribute_names=["fields"])
    return model


@router.delete("/{model_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_model(
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

    await session.delete(model)
    await session.commit()


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
