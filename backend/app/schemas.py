from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, EmailStr, field_validator


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str | None = None


class UserRead(BaseModel):
    id: int
    email: EmailStr
    name: str | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class WorkspaceCreate(BaseModel):
    name: str


class WorkspaceRead(BaseModel):
    id: int
    name: str
    created_at: datetime

    class Config:
        from_attributes = True


class WorkspaceMembershipRead(BaseModel):
    workspace: WorkspaceRead
    role: str

    class Config:
        from_attributes = True


class FieldCreate(BaseModel):
    name: str
    slug: str
    data_type: str
    is_required: bool = False
    is_unique: bool = False
    position: int = 0
    config: Optional[dict] = None

    @field_validator("data_type")
    @classmethod
    def validate_type(cls, v: str) -> str:
        allowed = {"string", "text", "number", "boolean", "date", "datetime", "enum", "relation"}
        if v not in allowed:
            raise ValueError("Unsupported field type")
        return v


class FieldRead(FieldCreate):
    id: int

    class Config:
        from_attributes = True


class FieldUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    data_type: Optional[str] = None
    is_required: Optional[bool] = None
    is_unique: Optional[bool] = None
    position: Optional[int] = None
    config: Optional[dict] = None

    @field_validator("data_type")
    @classmethod
    def validate_type(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        allowed = {"string", "text", "number", "boolean", "date", "datetime", "enum", "relation"}
        if v not in allowed:
            raise ValueError("Unsupported field type")
        return v


class ModelCreate(BaseModel):
    workspace_id: int
    name: str
    slug: str
    description: Optional[str] = None
    fields: List[FieldCreate]


class ModelUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    description: Optional[str] = None
    fields: Optional[List[FieldUpdate]] = None


class ModelRead(BaseModel):
    id: int
    workspace_id: int
    name: str
    slug: str
    description: Optional[str]
    fields: List[FieldRead]

    class Config:
        from_attributes = True


class RecordCreate(BaseModel):
    data: dict


class RecordRead(BaseModel):
    id: int
    model_id: int
    workspace_id: int
    created_by: Optional[int] = None
    updated_by: Optional[int] = None
    data: dict
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class RecordListResponse(BaseModel):
    items: list[RecordRead]
    total: int
    has_more: bool
