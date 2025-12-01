from datetime import datetime, date
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, asc, desc
from sqlalchemy.sql import Select
from ..dependencies import get_current_user
from ..db import get_session
from ..models import Record, Model, ModelField, WorkspaceMember
from ..schemas import RecordCreate, RecordRead, RecordListResponse
from ..core_config import settings

router = APIRouter(tags=["records"])


async def ensure_membership(session: AsyncSession, user_id: int, workspace_id: int):
    membership = await session.execute(
        select(WorkspaceMember).where(
            WorkspaceMember.user_id == user_id, WorkspaceMember.workspace_id == workspace_id
        )
    )
    if not membership.scalars().first():
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a member of workspace")


def _coerce_date(value: Any) -> date:
    if isinstance(value, (datetime, date)):
        return value.date() if isinstance(value, datetime) else value
    if isinstance(value, str):
        return datetime.fromisoformat(value).date()
    raise ValueError("Invalid date")


def _validate_field(field: ModelField, value: Any) -> str | None:
    if value is None:
        return "Field cannot be null"

    try:
        if field.data_type in {"string", "text"}:
            if not isinstance(value, str):
                return "Must be a string"
        elif field.data_type == "number":
            if isinstance(value, bool) or not isinstance(value, (int, float)):
                return "Must be a number"
        elif field.data_type == "boolean":
            if not isinstance(value, bool):
                return "Must be a boolean"
        elif field.data_type == "date":
            _coerce_date(value)
        elif field.data_type == "datetime":
            if isinstance(value, str):
                datetime.fromisoformat(value)
            elif not isinstance(value, datetime):
                return "Must be a datetime string or object"
        elif field.data_type == "enum":
            options = []
            if isinstance(field.config, dict):
                options = field.config.get("values") or field.config.get("options") or []
            if value not in options:
                return "Value not permitted"
        elif field.data_type == "relation":
            if not isinstance(value, int):
                return "Must reference related record id"
        else:
            return "Unsupported field type"
    except Exception:
        return "Invalid value"
    return None


async def _validate_relation_record(
    session: AsyncSession, field: ModelField, value: int, default_workspace_id: int
) -> str | None:
    record_result = await session.execute(select(Record).where(Record.id == value))
    related_record = record_result.scalars().first()
    if not related_record:
        return "Related record not found"

    config = field.config if isinstance(field.config, dict) else {}
    expected_workspace_id = config.get("workspace_id", default_workspace_id)
    expected_model_id = config.get("model_id")

    if expected_workspace_id and related_record.workspace_id != expected_workspace_id:
        return "Related record belongs to a different workspace"

    if expected_model_id and related_record.model_id != expected_model_id:
        return "Related record belongs to a different model"

    return None


async def _validate_uniqueness(
    session: AsyncSession, model: Model, field: ModelField, value: Any, record_id: int | None
) -> str | None:
    result = await session.execute(select(Record.id, Record.data).where(Record.model_id == model.id))
    for existing_id, record_data in result.all():
        if record_id and existing_id == record_id:
            continue
        if isinstance(record_data, dict) and record_data.get(field.slug) == value:
            return "Value must be unique"
    return None


async def validate_record_payload(
    session: AsyncSession, model: Model, data: dict, record_id: int | None = None
) -> None:
    await session.refresh(model, attribute_names=["fields"])
    errors: list[dict[str, str]] = []
    data = data or {}

    for field in model.fields:
        if field.is_required and field.slug not in data:
            errors.append({"field": field.slug, "error": "Field is required"})
            continue

        if field.slug not in data:
            continue

        value = data.get(field.slug)
        error = _validate_field(field, value)
        if error:
            errors.append({"field": field.slug, "error": error})
            continue

        if field.data_type == "relation":
            relation_error = await _validate_relation_record(
                session, field, value, default_workspace_id=model.workspace_id
            )
            if relation_error:
                errors.append({"field": field.slug, "error": relation_error})
                continue

        if field.is_unique:
            unique_error = await _validate_uniqueness(session, model, field, value, record_id)
            if unique_error:
                errors.append({"field": field.slug, "error": unique_error})

    if errors:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=errors)


async def get_model_with_membership(
    session: AsyncSession, model_id: int, user_id: int
) -> Model:
    model_result = await session.execute(select(Model).where(Model.id == model_id))
    model = model_result.scalars().first()
    if not model:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Model not found")
    await ensure_membership(session, user_id, model.workspace_id)
    return model


def _apply_sorting(query: Select, sort_by: str | None, sort_order: str) -> Select:
    if not sort_by or sort_by in {"created_at", "updated_at"}:
        column = Record.created_at if not sort_by or sort_by == "created_at" else Record.updated_at
        return query.order_by(asc(column) if sort_order == "asc" else desc(column))

    json_field = Record.data[sort_by].astext
    sorter = asc(json_field) if sort_order == "asc" else desc(json_field)
    return query.order_by(sorter)


def _apply_filters(query: Select, filter_key: str | None, filter_value: str | None) -> Select:
    if filter_key and filter_value is not None:
        query = query.where(Record.data[filter_key].astext == str(filter_value))
    return query


@router.post("/models/{model_id}/records", response_model=RecordRead)
async def create_record(
    model_id: int,
    payload: RecordCreate,
    session: AsyncSession = Depends(get_session),
    current_user=Depends(get_current_user),
):
    model = await get_model_with_membership(session, model_id, current_user.id)

    await validate_record_payload(session, model, payload.data)

    count_result = await session.execute(select(func.count()).select_from(Record).where(Record.model_id == model_id))
    total_records = count_result.scalar_one()
    if total_records >= settings.free_record_limit:
        raise HTTPException(status_code=status.HTTP_402_PAYMENT_REQUIRED, detail="Record limit reached. Upgrade plan")

    record = Record(
        model_id=model_id,
        workspace_id=model.workspace_id,
        created_by=current_user.id,
        updated_by=current_user.id,
        data=payload.data,
    )
    session.add(record)
    await session.commit()
    await session.refresh(record)
    return record


@router.get("/models/{model_id}/records", response_model=RecordListResponse)
async def list_records(
    model_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, gt=0, le=100),
    sort_by: str | None = Query(None, description="created_at, updated_at or field key"),
    sort_order: str = Query("asc", pattern="^(asc|desc)$"),
    filter_key: str | None = Query(None),
    filter_value: str | None = Query(None),
    session: AsyncSession = Depends(get_session),
    current_user=Depends(get_current_user),
):
    await get_model_with_membership(session, model_id, current_user.id)

    base_query: Select = select(Record).where(Record.model_id == model_id)
    filtered_query = _apply_filters(base_query, filter_key, filter_value)

    count_query = select(func.count()).select_from(Record).where(Record.model_id == model_id)
    count_query = _apply_filters(count_query, filter_key, filter_value)

    count_result = await session.execute(count_query)
    total = count_result.scalar_one()

    paginated_query = _apply_sorting(filtered_query, sort_by, sort_order)
    paginated_query = paginated_query.offset(skip).limit(limit)

    result = await session.execute(paginated_query)
    items = result.scalars().all()

    return {"items": items, "total": total, "has_more": skip + len(items) < total}


@router.get("/records/{record_id}", response_model=RecordRead)
async def view_record(
    record_id: int,
    session: AsyncSession = Depends(get_session),
    current_user=Depends(get_current_user),
):
    record_result = await session.execute(select(Record).where(Record.id == record_id))
    record = record_result.scalars().first()
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Record not found")

    model = await get_model_with_membership(session, record.model_id, current_user.id)
    await validate_record_payload(session, model, record.data, record_id=record.id)
    return record


@router.put("/records/{record_id}", response_model=RecordRead)
async def update_record(
    record_id: int,
    payload: RecordCreate,
    session: AsyncSession = Depends(get_session),
    current_user=Depends(get_current_user),
):
    record_result = await session.execute(select(Record).where(Record.id == record_id))
    record = record_result.scalars().first()
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Record not found")

    model = await get_model_with_membership(session, record.model_id, current_user.id)
    await validate_record_payload(session, model, payload.data, record_id=record.id)

    record.data = payload.data
    record.updated_by = current_user.id
    await session.commit()
    await session.refresh(record)
    return record


@router.delete("/records/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_record(
    record_id: int,
    session: AsyncSession = Depends(get_session),
    current_user=Depends(get_current_user),
):
    record_result = await session.execute(select(Record).where(Record.id == record_id))
    record = record_result.scalars().first()
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Record not found")

    await ensure_membership(session, current_user.id, record.workspace_id)

    await session.delete(record)
    await session.commit()
