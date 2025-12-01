from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ..db import get_session
from ..models import User, Workspace, WorkspaceMember
from ..schemas import UserCreate, UserRead, Token
from ..security import verify_password, get_password_hash, create_access_token

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserRead)
async def register(payload: UserCreate, session: AsyncSession = Depends(get_session)):
    existing = await session.execute(select(User).where(User.email == payload.email))
    if existing.scalars().first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    user = User(email=payload.email, password_hash=get_password_hash(payload.password))
    session.add(user)
    await session.flush()

    workspace = Workspace(name=f"{payload.email.split('@')[0]}'s Workspace", created_by=user.id)
    session.add(workspace)
    await session.flush()
    membership = WorkspaceMember(user_id=user.id, workspace_id=workspace.id, role="owner")
    session.add(membership)

    await session.commit()
    await session.refresh(user)
    return user


@router.post("/token", response_model=Token)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(select(User).where(User.email == form_data.username))
    user = result.scalars().first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect username or password")
    access_token = create_access_token(subject=str(user.id))
    return Token(access_token=access_token)
