import asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .core_config import settings
from .db import engine, Base
from .routers import auth, workspaces, models, records

app = FastAPI(title=settings.app_name, openapi_url=f"{settings.api_prefix}/openapi.json")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix=settings.api_prefix)
app.include_router(workspaces.router, prefix=settings.api_prefix)
app.include_router(workspaces.legacy_router, prefix=settings.api_prefix)
app.include_router(models.router, prefix=settings.api_prefix)
app.include_router(records.router, prefix=settings.api_prefix)


@app.on_event("startup")
async def on_startup() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


@app.get("/health")
async def healthcheck():
    return {"status": "ok"}
