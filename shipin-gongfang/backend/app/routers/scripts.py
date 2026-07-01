"""脚本生成 API"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models import Project, Script, ScriptSegment, UserAIConfig
from app.services.ai_proxy import AIProxy
from app.utils.auth_deps import get_current_user

router = APIRouter(prefix="/api", tags=["scripts"])


async def _get_ai_proxy(project_id: int, user_id: int, db: AsyncSession):
    """获取项目的AI代理实例"""
    result = await db.execute(select(Project).where(Project.id == project_id, Project.user_id == user_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(404, "项目不存在")

    cfg_result = await db.execute(
        select(UserAIConfig).where(
            UserAIConfig.user_id == user_id,
            UserAIConfig.is_active == True,
        )
    )
    config = cfg_result.scalar_one_or_none()
    if not config:
        raise HTTPException(400, "请先在设置中配置AI平台")

    return AIProxy(config.platform, config.api_token_encrypted), config.platform


@router.post("/projects/{project_id}/scripts/generate")
async def generate_scripts(
    project_id: int,
    template_type: str = "口播种草型",
    product_features: str = "优质商品，性价比高，用户好评如潮",
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """生成脚本（3个版本）"""
    proxy, platform = await _get_ai_proxy(project_id, user["user_id"], db)

    # 获取项目
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one()

    # 调用AI生成
    data = await proxy.generate_script(
        product_name=project.name,
        product_features=product_features,
        template_type=template_type,
        target_platform=project.target_platform,
        target_duration=project.target_duration,
    )

    # 保存脚本
    scripts = []
    if isinstance(data, list):
        for i, version_data in enumerate(data):
            script = Script(
                project_id=project_id,
                version=i + 1,
                template_type=template_type,
                title=version_data.get("title", ""),
                total_duration=version_data.get("totalDuration", 45),
                total_words=sum(len(s.get("narration", "")) for s in version_data.get("segments", [])),
                tags=version_data.get("tags", []),
                is_selected=(i == 0),
            )
            db.add(script)
            await db.flush()

            for j, seg_data in enumerate(version_data.get("segments", [])):
                segment = ScriptSegment(
                    script_id=script.id,
                    segment_type=seg_data.get("type", "body"),
                    narration=seg_data.get("narration", ""),
                    visual_description=seg_data.get("visualDescription", ""),
                    duration_estimate=seg_data.get("durationEstimate", 5),
                    sort_order=j,
                )
                db.add(segment)

            await db.refresh(script)
            scripts.append(script)

    # 更新项目状态
    project.current_step = 1
    project.status = "script"
    project.ai_platform = platform

    return {
        "scripts": [
            {
                "id": s.id,
                "projectId": s.project_id,
                "version": s.version,
                "templateType": s.template_type,
                "title": s.title,
                "totalDuration": s.total_duration,
                "totalWords": s.total_words,
                "tags": s.tags,
                "isSelected": s.is_selected,
                "segments": [
                    {
                        "id": seg.id,
                        "type": seg.segment_type,
                        "narration": seg.narration,
                        "visualDescription": seg.visual_description,
                        "durationEstimate": seg.duration_estimate,
                        "sortOrder": seg.sort_order,
                    }
                    for seg in s.segments
                ] if hasattr(s, 'segments') else [],
            }
            for s in scripts
        ]
    }


@router.get("/projects/{project_id}/scripts")
async def get_scripts(project_id: int, db: AsyncSession = Depends(get_db)):
    """获取项目的所有脚本"""
    result = await db.execute(
        select(Script).where(Script.project_id == project_id).order_by(Script.version)
    )
    scripts = result.scalars().all()

    # 延迟加载segments
    out = []
    for s in scripts:
        seg_result = await db.execute(
            select(ScriptSegment).where(ScriptSegment.script_id == s.id).order_by(ScriptSegment.sort_order)
        )
        segments = seg_result.scalars().all()
        out.append({
            "id": s.id, "projectId": s.project_id, "version": s.version,
            "templateType": s.template_type, "title": s.title,
            "totalDuration": s.total_duration, "totalWords": s.total_words,
            "tags": s.tags, "isSelected": s.is_selected,
            "segments": [{
                "id": seg.id, "type": seg.segment_type, "narration": seg.narration,
                "visualDescription": seg.visual_description,
                "durationEstimate": seg.duration_estimate, "sortOrder": seg.sort_order,
            } for seg in segments],
        })
    return {"scripts": out}


@router.post("/api/scripts/{script_id}/segments/{segment_id}/rewrite")
async def rewrite_segment(
    script_id: int, segment_id: int, action: str = "more_interesting",
    db: AsyncSession = Depends(get_db),
):
    """AI改写脚本段落"""
    result = await db.execute(select(ScriptSegment).where(ScriptSegment.id == segment_id))
    segment = result.scalar_one_or_none()
    if not segment:
        raise HTTPException(404, "段落不存在")

    script_result = await db.execute(select(Script).where(Script.id == script_id))
    script = script_result.scalar_one()

    proxy, _ = await _get_ai_proxy(script.project_id, db)
    new_text = await proxy.optimize_video_script(segment.narration, action)

    return {"text": new_text}
