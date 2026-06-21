import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler

from .core.config import settings
from .core.rate_limit import limiter
from .api.routes import mosaic, users, plans, payments, admin
from .services.cleanup_service import cleanup_expired_jobs


@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(cleanup_expired_jobs())
    yield
    task.cancel()


app = FastAPI(
    title="MosaicForge API",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.environment == "development" else None,
    redoc_url=None,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(mosaic.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(plans.router, prefix="/api")
app.include_router(payments.router, prefix="/api")
app.include_router(admin.router)   # no /api prefix; accessed at /admin/*


@app.get("/health")
async def health():
    return {"status": "ok"}
