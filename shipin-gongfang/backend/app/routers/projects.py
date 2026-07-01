"""项目 CRUD API"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from typing import Optional

from app.database import get_db
from app.models import Project
from app.utils.auth_deps import get_current_user, require_admin

router = APIRouter(prefix="/api/projects", tags=["projects"])


@router.get("")
async def list_projects(
    status: Optional[str] = None,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取当前用户的项目列表"""
    query = select(Project).where(Project.user_id == user["user_id"])
    if status:
        query = query.where(Project.status == status)
    query = query.order_by(desc(Project.updated_at))

    result = await db.execute(query)
    projects = result.scalars().all()

    return {
        "projects": [
            {
                "id": p.id,
                "name": p.name,
                "targetPlatform": p.target_platform,
                "targetDuration": p.target_duration,
                "status": p.status,
                "currentStep": p.current_step,
                "aiPlatform": p.ai_platform,
                "updatedAt": p.updated_at.isoformat() if p.updated_at else None,
            }
            for p in projects
        ]
    }


@router.post("")
async def create_project(
    name: str,
    target_platform: str = "抖音",
    target_duration: int = 45,
    material_type: Optional[str] = None,
    material_data: Optional[dict] = None,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """创建新项目"""
    project = Project(
        user_id=user["user_id"],
        name=name,
        target_platform=target_platform,
        target_duration=target_duration,
        material_type=material_type,
        material_data=material_data,
        current_step=0,
    )
    db.add(project)
    await db.flush()
    await db.refresh(project)

    return {
        "id": project.id,
        "name": project.name,
        "status": project.status,
    }


@router.get("/{project_id}")
async def get_project(project_id: int, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """获取项目详情"""
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.user_id == user["user_id"])
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")

    return {
        "id": project.id,
        "name": project.name,
        "targetPlatform": project.target_platform,
        "targetDuration": project.target_duration,
        "status": project.status,
        "currentStep": project.current_step,
        "aiPlatform": project.ai_platform,
        "materialType": project.material_type,
        "materialData": project.material_data,
        "createdAt": project.created_at.isoformat() if project.created_at else None,
        "updatedAt": project.updated_at.isoformat() if project.updated_at else None,
    }


@router.put("/{project_id}")
async def update_project(
    project_id: int,
    name: Optional[str] = None,
    status: Optional[str] = None,
    current_step: Optional[int] = None,
    ai_platform: Optional[str] = None,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """更新项目"""
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.user_id == user["user_id"])
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")

    if name is not None:
        project.name = name
    if status is not None:
        project.status = status
    if current_step is not None:
        project.current_step = current_step
    if ai_platform is not None:
        project.ai_platform = ai_platform

    return {"ok": True}


@router.delete("/{project_id}")
async def delete_project(project_id: int, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """删除项目"""
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.user_id == user["user_id"])
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")

    await db.delete(project)
    return {"ok": True}
