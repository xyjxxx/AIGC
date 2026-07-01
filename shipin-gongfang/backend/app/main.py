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
from sqlalchemy import select


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    # 启动时：确保数据库表已创建
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    # 初始化管理员账号
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
