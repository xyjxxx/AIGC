"""数据模型定义"""
from sqlalchemy import Column, Integer, String, Float, Boolean, Text, JSON, TIMESTAMP, ForeignKey, Index, Enum as SAEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.database import Base


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    USER = "user"


class User(Base):
    """用户表 — 管理员创建用户账号"""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(64), unique=True, nullable=False)
    password_hash = Column(String(256), nullable=False)  # bcrypt hash
    display_name = Column(String(64), default="")
    role = Column(String(10), default="user", comment="admin / user")
    is_active = Column(Boolean, default=True, comment="管理员可禁用账号")
    created_by = Column(Integer, nullable=True, comment="创建者（管理员）ID")
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    ai_configs = relationship("UserAIConfig", back_populates="user", cascade="all, delete-orphan")
    projects = relationship("Project", back_populates="owner", cascade="all, delete-orphan")


class UserAIConfig(Base):
    __tablename__ = "user_ai_configs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    platform = Column(String(20), nullable=False, comment="openai / doubao")
    api_token_encrypted = Column(Text, nullable=False, comment="AES-256-GCM 加密后的 API Token")
    is_active = Column(Boolean, default=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="ai_configs")

    __table_args__ = (
        Index("uk_user_platform", "user_id", "platform", unique=True),
    )


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(200), nullable=False)
    target_platform = Column(String(20), default="抖音")
    target_duration = Column(Integer, default=45)
    status = Column(String(20), default="draft", comment="draft/script/storyboard/images/video/done")
    current_step = Column(Integer, default=0, comment="当前步骤 0-4")
    ai_platform = Column(String(20))
    material_type = Column(String(20))
    material_data = Column(JSON)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    owner = relationship("User", back_populates="projects")
    scripts = relationship("Script", back_populates="project", cascade="all, delete-orphan")
    storyboard_shots = relationship("StoryboardShot", back_populates="project", cascade="all, delete-orphan")
    videos = relationship("Video", back_populates="project", cascade="all, delete-orphan")

    __table_args__ = (Index("idx_user_status", "user_id", "status"),)


class Script(Base):
    __tablename__ = "scripts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    version = Column(Integer, default=1)
    template_type = Column(String(30))
    title = Column(String(500))
    total_duration = Column(Integer, default=0)
    total_words = Column(Integer, default=0)
    tags = Column(JSON)
    is_selected = Column(Boolean, default=False)
    status = Column(String(20), default="draft")
    created_at = Column(TIMESTAMP, server_default=func.now())

    project = relationship("Project", back_populates="scripts")
    segments = relationship("ScriptSegment", back_populates="script", cascade="all, delete-orphan")

    __table_args__ = (Index("idx_project_version", "project_id", "version"),)


class ScriptSegment(Base):
    __tablename__ = "script_segments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    script_id = Column(Integer, ForeignKey("scripts.id", ondelete="CASCADE"), nullable=False)
    segment_type = Column(String(20), nullable=False, comment="opening/body/closing")
    narration = Column(Text, nullable=False, comment="口播文案")
    visual_description = Column(Text)
    duration_estimate = Column(Integer, default=5)
    sort_order = Column(Integer, default=0)
    created_at = Column(TIMESTAMP, server_default=func.now())

    script = relationship("Script", back_populates="segments")

    __table_args__ = (Index("idx_script_order", "script_id", "sort_order"),)


class StoryboardShot(Base):
    __tablename__ = "storyboard_shots"

    id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    script_id = Column(Integer)
    shot_number = Column(Integer, nullable=False, comment="分镜编号")
    duration = Column(Float, nullable=False, default=3.0)
    scene_type = Column(String(20), default="MEDIUM", comment="CLOSE_UP/MEDIUM/LONG/WIDE")
    camera_movement = Column(String(20), default="FIXED", comment="FIXED/PUSH/PULL/PAN/TILT/FOLLOW")
    visual_description = Column(Text)
    narration_ref = Column(Text, comment="对应口播文案")
    transition = Column(String(20), default="CUT")
    sort_order = Column(Integer, default=0)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    project = relationship("Project", back_populates="storyboard_shots")
    images = relationship("ShotImage", back_populates="shot", cascade="all, delete-orphan")

    __table_args__ = (Index("idx_project_order", "project_id", "sort_order"),)


class ShotImage(Base):
    __tablename__ = "shot_images"

    id = Column(Integer, primary_key=True, autoincrement=True)
    shot_id = Column(Integer, ForeignKey("storyboard_shots.id", ondelete="CASCADE"), nullable=False)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    style = Column(String(30), default="真实摄影")
    prompt = Column(Text)
    negative_prompt = Column(Text)
    image_url = Column(String(1000), comment="本地存储路径")
    variants = Column(JSON, comment="变体URL列表")
    status = Column(String(20), default="pending", comment="pending/generating/done/rejected")
    sort_order = Column(Integer, default=0)
    created_at = Column(TIMESTAMP, server_default=func.now())

    shot = relationship("StoryboardShot", back_populates="images")

    __table_args__ = (Index("idx_shot_status", "shot_id", "status"),)


class Video(Base):
    __tablename__ = "videos"

    id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    voice_type = Column(String(30), default="女-温柔")
    voice_speed = Column(Float, default=1.0)
    voice_tone = Column(String(20), default="活泼")
    bgm_source = Column(String(200))
    bgm_volume = Column(Float, default=0.3)
    subtitle_style = Column(String(30), default="带货风")
    resolution = Column(String(10), default="1080P")
    aspect_ratio = Column(String(10), default="9:16")
    fps = Column(Integer, default=30)
    output_format = Column(String(10), default="MP4")
    video_url = Column(String(1000))
    file_size = Column(Integer, default=0)
    duration = Column(Integer, default=0)
    status = Column(String(20), default="pending")
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    project = relationship("Project", back_populates="videos")
