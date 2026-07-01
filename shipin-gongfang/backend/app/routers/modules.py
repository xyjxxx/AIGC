"""分镜、分镜图、视频、AI平台配置 API"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models import Project, Script, ScriptSegment, StoryboardShot, ShotImage, Video, UserAIConfig
from app.services.ai_proxy import AIProxy
from app.utils.crypto import encrypt_token, decrypt_token
from app.utils.auth_deps import get_current_user

router = APIRouter(prefix="/api", tags=["storyboard-images-video-ai"])


async def _get_ai_proxy(project_id: int, user_id: int, db: AsyncSession):
    result = await db.execute(select(Project).where(Project.id == project_id, Project.user_id == user_id))
    project = result.scalar_one_or_none()
    if not project: raise HTTPException(404, "项目不存在")
    cfg_result = await db.execute(
        select(UserAIConfig).where(UserAIConfig.user_id == user_id, UserAIConfig.is_active == True)
    )
    config = cfg_result.scalar_one_or_none()
    if not config: raise HTTPException(400, "请先在设置中配置AI平台")
    return AIProxy(config.platform, config.api_token_encrypted), config.platform


# ===== 分镜 =====
@router.post("/projects/{project_id}/storyboard/generate")
async def generate_storyboard(project_id: int, script_id: int = 0, db: AsyncSession = Depends(get_db)):
    """生成分镜"""
    proxy, _ = await _get_ai_proxy(project_id, db)

    # 获取选中的脚本
    if script_id:
        result = await db.execute(select(Script).where(Script.id == script_id))
    else:
        result = await db.execute(select(Script).where(Script.project_id == project_id, Script.is_selected == True))
    script = result.scalar_one_or_none()
    if not script:
        result = await db.execute(select(Script).where(Script.project_id == project_id).limit(1))
        script = result.scalar_one_or_none()
    if not script: raise HTTPException(404, "没有脚本，请先生成脚本")

    # 获取脚本段落拼接文本
    seg_result = await db.execute(
        select(ScriptSegment).where(ScriptSegment.script_id == script.id).order_by(ScriptSegment.sort_order)
    )
    segments = seg_result.scalars().all()
    script_text = "\n".join([f"[{s.segment_type}] {s.narration}" for s in segments])

    # 调用AI
    shots_data = await proxy.generate_storyboard(script_text)

    # 删除旧分镜
    old = await db.execute(select(StoryboardShot).where(StoryboardShot.project_id == project_id))
    for o in old.scalars(): await db.delete(o)

    # 保存新分镜
    shots = []
    if isinstance(shots_data, list):
        for i, sd in enumerate(shots_data):
            shot = StoryboardShot(
                project_id=project_id, script_id=script.id,
                shot_number=sd.get("shotNumber", i + 1),
                duration=float(sd.get("duration", 3)),
                scene_type=sd.get("sceneType", "MEDIUM"),
                camera_movement=sd.get("cameraMovement", "FIXED"),
                visual_description=sd.get("visualDescription", ""),
                narration_ref=sd.get("narrationRef", ""),
                transition=sd.get("transition", "CUT"),
                sort_order=i,
            )
            db.add(shot)
            await db.flush()
            shots.append(shot)

    project_result = await db.execute(select(Project).where(Project.id == project_id))
    project = project_result.scalar_one()
    project.current_step = 2
    project.status = "storyboard"

    return {"shots": [{
        "id": s.id, "projectId": s.project_id, "shotNumber": s.shot_number,
        "duration": s.duration, "sceneType": s.scene_type,
        "cameraMovement": s.camera_movement, "visualDescription": s.visual_description,
        "narrationRef": s.narration_ref, "transition": s.transition, "sortOrder": s.sort_order,
    } for s in shots]}


@router.get("/projects/{project_id}/storyboard")
async def get_storyboard(project_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(StoryboardShot).where(StoryboardShot.project_id == project_id).order_by(StoryboardShot.sort_order)
    )
    shots = result.scalars().all()
    return {"shots": [{
        "id": s.id, "projectId": s.project_id, "shotNumber": s.shot_number,
        "duration": s.duration, "sceneType": s.scene_type,
        "cameraMovement": s.camera_movement, "visualDescription": s.visual_description,
        "narrationRef": s.narration_ref, "transition": s.transition, "sortOrder": s.sort_order,
    } for s in shots]}


# ===== 分镜图 =====
@router.post("/projects/{project_id}/images/generate")
async def generate_images(project_id: int, style: str = "真实摄影", db: AsyncSession = Depends(get_db)):
    """为所有分镜生成图片提示词"""
    proxy, _ = await _get_ai_proxy(project_id, db)

    shots_result = await db.execute(
        select(StoryboardShot).where(StoryboardShot.project_id == project_id).order_by(StoryboardShot.sort_order)
    )
    shots = shots_result.scalars().all()
    if not shots: raise HTTPException(404, "没有分镜，请先生成分镜")

    images = []
    for shot in shots:
        prompt_data = await proxy.generate_image_prompt(shot.visual_description or "产品展示", style)
        img = ShotImage(
            shot_id=shot.id, project_id=project_id, style=style,
            prompt=prompt_data.get("prompt", ""),
            negative_prompt=prompt_data.get("negative_prompt", ""),
            image_url=f"/storage/outputs/placeholder_{shot.shot_number}.png",
            status="done",
            sort_order=shot.sort_order,
        )
        db.add(img)
        await db.flush()
        images.append(img)

    project_result = await db.execute(select(Project).where(Project.id == project_id))
    project = project_result.scalar_one()
    project.current_step = 3
    project.status = "images"

    return {"images": [{
        "id": i.id, "shotId": i.shot_id, "projectId": i.project_id,
        "style": i.style, "prompt": i.prompt, "negativePrompt": i.negative_prompt,
        "imageUrl": i.image_url, "status": i.status, "sortOrder": i.sort_order,
    } for i in images]}


@router.get("/projects/{project_id}/images")
async def get_images(project_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ShotImage).where(ShotImage.project_id == project_id).order_by(ShotImage.sort_order)
    )
    imgs = result.scalars().all()
    return {"images": [{
        "id": i.id, "shotId": i.shot_id, "projectId": i.project_id,
        "style": i.style, "prompt": i.prompt, "negativePrompt": i.negative_prompt,
        "imageUrl": i.image_url, "variants": i.variants, "status": i.status, "sortOrder": i.sort_order,
    } for i in imgs]}


# ===== 视频 =====
@router.post("/projects/{project_id}/video/compose")
async def compose_video(project_id: int, db: AsyncSession = Depends(get_db), **kwargs):
    """合成视频（当前为占位实现）"""
    result = await db.execute(select(Video).where(Video.project_id == project_id))
    existing = result.scalar_one_or_none()

    if existing:
        video = existing
        for k, v in kwargs.items():
            if hasattr(video, k): setattr(video, k, v)
    else:
        video = Video(project_id=project_id, **{k: v for k, v in kwargs.items() if hasattr(Video, k)})
        db.add(video)

    video.status = "done"
    video.video_url = f"/storage/outputs/project_{project_id}_output.mp4"
    video.duration = 45
    video.file_size = 18 * 1024 * 1024
    await db.flush()

    project_result = await db.execute(select(Project).where(Project.id == project_id))
    project = project_result.scalar_one()
    project.current_step = 4
    project.status = "done"

    return {"video": {
        "id": video.id, "projectId": video.project_id,
        "voiceType": video.voice_type, "voiceSpeed": video.voice_speed,
        "voiceTone": video.voice_tone, "bgmSource": video.bgm_source,
        "bgmVolume": video.bgm_volume, "subtitleStyle": video.subtitle_style,
        "resolution": video.resolution, "aspectRatio": video.aspect_ratio,
        "fps": video.fps, "outputFormat": video.output_format,
        "videoUrl": video.video_url, "fileSize": video.file_size,
        "duration": video.duration, "status": video.status,
    }}


@router.get("/projects/{project_id}/video")
async def get_video(project_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Video).where(Video.project_id == project_id))
    video = result.scalar_one_or_none()
    if not video: raise HTTPException(404, "视频不存在")
    return {"video": {
        "id": video.id, "projectId": video.project_id,
        "voiceType": video.voice_type, "voiceSpeed": video.voice_speed,
        "voiceTone": video.voice_tone, "bgmSource": video.bgm_source,
        "bgmVolume": video.bgm_volume, "subtitleStyle": video.subtitle_style,
        "resolution": video.resolution, "aspectRatio": video.aspect_ratio,
        "fps": video.fps, "outputFormat": video.output_format,
        "videoUrl": video.video_url, "fileSize": video.file_size,
        "duration": video.duration, "status": video.status,
    }}


# ===== AI 平台配置 =====
@router.get("/ai-platform/config")
async def get_ai_config(user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(UserAIConfig).where(UserAIConfig.user_id == user["user_id"])
    )
    configs = result.scalars().all()
    return {"configs": [
        {"id": c.id, "platform": c.platform, "hasToken": bool(c.api_token_encrypted), "isActive": c.is_active}
        for c in configs
    ]}


@router.post("/ai-platform/config")
async def save_ai_config(platform: str, api_token: str, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """保存AI平台配置"""
    result = await db.execute(
        select(UserAIConfig).where(UserAIConfig.user_id == user["user_id"], UserAIConfig.platform == platform)
    )
    config = result.scalar_one_or_none()

    encrypted = encrypt_token(api_token)

    if config:
        config.api_token_encrypted = encrypted
        config.is_active = True
    else:
        # 新配置：将之前的active设为false
        old_result = await db.execute(
            select(UserAIConfig).where(UserAIConfig.user_id == user["user_id"], UserAIConfig.is_active == True)
        )
        for old in old_result.scalars():
            old.is_active = False
        config = UserAIConfig(user_id=user["user_id"], platform=platform, api_token_encrypted=encrypted, is_active=True)
        db.add(config)

    return {"ok": True}


@router.delete("/ai-platform/config/{platform}")
async def delete_ai_config(platform: str, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(UserAIConfig).where(UserAIConfig.user_id == user["user_id"], UserAIConfig.platform == platform)
    )
    config = result.scalar_one_or_none()
    if config:
        await db.delete(config)
    return {"ok": True}
