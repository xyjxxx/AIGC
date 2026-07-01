"""FastAPI 应用入口"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import os

from app.config import settings
from app.database import engine, Base, async_session
from app.routers import projects, scripts, modules, auth
from app.models import User
from sqlalchemy import select, create_engine


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    # 启动时：使用同步引擎创建表（避免 aiosqlite greenlet 问题）
    if settings.use_sqlite:
        sync_url = settings.database_url.replace("sqlite+aiosqlite:///", "sqlite:///")
        sync_engine = create_engine(sync_url)
        Base.metadata.create_all(sync_engine)
        # 使用同步会话初始化管理员
        from sqlalchemy.orm import Session
        with Session(sync_engine) as session:
            auth.init_admin_sync(session)
            session.commit()
        sync_engine.dispose()
    else:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        async with async_session() as session:
            await auth.init_admin(session)
            await session.commit()
    # 确保存储目录存在
    os.makedirs(settings.storage_upload_path, exist_ok=True)
    os.makedirs(settings.storage_output_path, exist_ok=True)
    yield
    # 关闭时：释放连接
    await engine.dispose()


app = FastAPI(
    title="微创AI带货视频工坊 API",
    description="AI视频创作平台后端服务",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(auth.router)
app.include_router(projects.router)
app.include_router(scripts.router)
app.include_router(modules.router)

# 静态文件（本地存储）
os.makedirs("../storage", exist_ok=True)
if os.path.exists("../storage"):
    app.mount("/storage", StaticFiles(directory="../storage"), name="storage")


@app.get("/api/health")
async def health_check():
    """健康检查"""
    return {"status": "ok", "version": "1.0.0"}
