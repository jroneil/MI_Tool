from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, EmailStr, field_validator


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserCreate(BaseModel):
    email: EmailStr
    password: str


class UserRead(BaseModel):
    id: int
    email: EmailStr
    created_at: datetime

    class Config:
        from_attributes = True


class OrganizationCreate(BaseModel):
    name: str


class OrganizationRead(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True


class MembershipRead(BaseModel):
    organization: OrganizationRead
    role: str

    class Config:
        from_attributes = True


class FieldCreate(BaseModel):
    name: str
    key: str
    field_type: str
    required: bool = False
    options: Optional[dict] = None

    @field_validator("field_type")
    @classmethod
    def validate_type(cls, v: str) -> str:
        allowed = {"string", "number", "boolean", "date", "enum", "longtext", "relation"}
        if v not in allowed:
            raise ValueError("Unsupported field type")
        return v


class FieldRead(FieldCreate):
    id: int

    class Config:
        from_attributes = True


class ModelCreate(BaseModel):
    organization_id: int
    name: str
    slug: str
    description: Optional[str] = None
    fields: List[FieldCreate]


class ModelRead(BaseModel):
    id: int
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
    data: dict
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
