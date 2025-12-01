from datetime import datetime
from typing import Optional
from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import ENUM, JSONB
from sqlalchemy.orm import relationship, Mapped, mapped_column
from .db import Base


workspace_role_enum = ENUM(
    "owner",
    "admin",
    "member",
    name="workspace_role_enum",
    create_type=False,
)

model_field_type_enum = ENUM(
    "string",
    "text",
    "number",
    "boolean",
    "date",
    "datetime",
    "enum",
    "relation",
    name="model_field_data_type",
    create_type=False,
)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    name: Mapped[Optional[str]] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    memberships = relationship("WorkspaceMember", back_populates="user")
    workspaces_created = relationship("Workspace", back_populates="creator")
    models_created = relationship("Model", back_populates="creator")
    records_created = relationship(
        "Record", back_populates="created_by_user", foreign_keys="Record.created_by"
    )
    records_updated = relationship(
        "Record", back_populates="updated_by_user", foreign_keys="Record.updated_by"
    )


class Workspace(Base):
    __tablename__ = "workspaces"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    created_by: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))

    creator = relationship("User", back_populates="workspaces_created")
    memberships = relationship("WorkspaceMember", back_populates="workspace")
    models = relationship("Model", back_populates="workspace")


class WorkspaceMember(Base):
    __tablename__ = "workspace_members"
    __table_args__ = (UniqueConstraint("user_id", "workspace_id", name="uq_membership"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    workspace_id: Mapped[int] = mapped_column(ForeignKey("workspaces.id", ondelete="CASCADE"))
    role: Mapped[str] = mapped_column(workspace_role_enum, default="member", nullable=False)

    user = relationship("User", back_populates="memberships")
    workspace = relationship("Workspace", back_populates="memberships")


class Model(Base):
    __tablename__ = "models"
    __table_args__ = (UniqueConstraint("workspace_id", "slug", name="uq_model_slug"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    workspace_id: Mapped[int] = mapped_column(ForeignKey("workspaces.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    created_by: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))

    workspace = relationship("Workspace", back_populates="models")
    creator = relationship("User", back_populates="models_created")
    fields = relationship("ModelField", back_populates="model", cascade="all, delete")
    records = relationship("Record", back_populates="model", cascade="all, delete")


class ModelField(Base):
    __tablename__ = "model_fields"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    model_id: Mapped[int] = mapped_column(ForeignKey("models.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(255), nullable=False)
    data_type: Mapped[str] = mapped_column(model_field_type_enum, nullable=False)
    is_required: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_unique: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    position: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    config: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)

    model = relationship("Model", back_populates="fields")


class Record(Base):
    __tablename__ = "records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    model_id: Mapped[int] = mapped_column(ForeignKey("models.id", ondelete="CASCADE"))
    workspace_id: Mapped[int] = mapped_column(ForeignKey("workspaces.id", ondelete="CASCADE"))
    created_by: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    updated_by: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    data: Mapped[dict] = mapped_column(JSONB, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    model = relationship("Model", back_populates="records")
    workspace = relationship("Workspace")
    created_by_user = relationship("User", foreign_keys=[created_by], back_populates="records_created")
    updated_by_user = relationship("User", foreign_keys=[updated_by], back_populates="records_updated")
