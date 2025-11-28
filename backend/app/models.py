from datetime import datetime
from typing import Optional
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, Text, JSON, UniqueConstraint
from sqlalchemy.orm import relationship, Mapped, mapped_column
from .db import Base

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    memberships = relationship("Membership", back_populates="user")

class Organization(Base):
    __tablename__ = "organizations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    memberships = relationship("Membership", back_populates="organization")
    models = relationship("Model", back_populates="organization")

class Membership(Base):
    __tablename__ = "memberships"
    __table_args__ = (UniqueConstraint("user_id", "organization_id", name="uq_membership"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    organization_id: Mapped[int] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"))
    role: Mapped[str] = mapped_column(String(50), default="member")

    user = relationship("User", back_populates="memberships")
    organization = relationship("Organization", back_populates="memberships")

class Model(Base):
    __tablename__ = "models"
    __table_args__ = (UniqueConstraint("organization_id", "slug", name="uq_model_slug"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    organization_id: Mapped[int] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    organization = relationship("Organization", back_populates="models")
    fields = relationship("Field", back_populates="model", cascade="all, delete")
    records = relationship("Record", back_populates="model", cascade="all, delete")

class Field(Base):
    __tablename__ = "fields"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    model_id: Mapped[int] = mapped_column(ForeignKey("models.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    key: Mapped[str] = mapped_column(String(255), nullable=False)
    field_type: Mapped[str] = mapped_column(String(50), nullable=False)
    required: Mapped[bool] = mapped_column(Boolean, default=False)
    options: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    model = relationship("Model", back_populates="fields")

class Record(Base):
    __tablename__ = "records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    model_id: Mapped[int] = mapped_column(ForeignKey("models.id", ondelete="CASCADE"))
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    data: Mapped[dict] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    model = relationship("Model", back_populates="records")
