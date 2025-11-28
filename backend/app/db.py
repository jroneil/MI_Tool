from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from .core_config import settings

engine = create_async_engine(settings.db_url, echo=False, future=True)
AsyncSessionLocal = sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

Base = declarative_base()

async def get_session() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session
