-- 初始化数据库表结构
CREATE DATABASE IF NOT EXISTS shipin_gongfang CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE shipin_gongfang;

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(64) NOT NULL UNIQUE,
    password_hash VARCHAR(256) NOT NULL COMMENT 'bcrypt hash',
    display_name VARCHAR(64) DEFAULT '',
    role VARCHAR(10) DEFAULT 'user' COMMENT 'admin / user',
    is_active BOOLEAN DEFAULT TRUE COMMENT '管理员可禁用',
    created_by BIGINT COMMENT '创建者（管理员）ID',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 用户AI平台配置表
CREATE TABLE IF NOT EXISTS user_ai_configs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    platform VARCHAR(20) NOT NULL COMMENT 'openai / doubao',
    api_token_encrypted TEXT NOT NULL COMMENT 'AES-256-GCM 加密后的 API Token',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_user_platform (user_id, platform),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 项目表
CREATE TABLE IF NOT EXISTS projects (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    name VARCHAR(200) NOT NULL,
    ...
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    target_platform VARCHAR(20) DEFAULT '抖音' COMMENT '目标发布平台',
    target_duration INT DEFAULT 45 COMMENT '目标时长(秒)',
    status VARCHAR(20) DEFAULT 'draft' COMMENT 'draft/script/storyboard/images/video/done',
    current_step INT DEFAULT 0 COMMENT '当前步骤 0-4',
    ai_platform VARCHAR(20) DEFAULT NULL COMMENT '使用的AI平台',
    material_type VARCHAR(20) DEFAULT NULL COMMENT '素材类型: link/image/text/document/csv',
    material_data JSON DEFAULT NULL COMMENT '素材原始数据',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_status (user_id, status)
) ENGINE=InnoDB;

-- 脚本表
CREATE TABLE IF NOT EXISTS scripts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    project_id BIGINT NOT NULL,
    version INT DEFAULT 1 COMMENT '版本号',
    template_type VARCHAR(30) DEFAULT NULL COMMENT '模板类型',
    title VARCHAR(500) DEFAULT NULL,
    total_duration INT DEFAULT 0,
    total_words INT DEFAULT 0,
    tags JSON DEFAULT NULL,
    is_selected BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    INDEX idx_project_version (project_id, version)
) ENGINE=InnoDB;

-- 脚本段落表
CREATE TABLE IF NOT EXISTS script_segments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    script_id BIGINT NOT NULL,
    segment_type VARCHAR(20) NOT NULL COMMENT 'opening/body/closing',
    narration TEXT NOT NULL COMMENT '口播文案',
    visual_description TEXT COMMENT '画面描述',
    duration_estimate INT DEFAULT 5 COMMENT '预估时长(秒)',
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (script_id) REFERENCES scripts(id) ON DELETE CASCADE,
    INDEX idx_script_order (script_id, sort_order)
) ENGINE=InnoDB;

-- 分镜表
CREATE TABLE IF NOT EXISTS storyboard_shots (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    project_id BIGINT NOT NULL,
    script_id BIGINT DEFAULT NULL,
    shot_number INT NOT NULL COMMENT '分镜编号 S01, S02...',
    duration DECIMAL(4,1) NOT NULL DEFAULT 3.0,
    scene_type VARCHAR(20) DEFAULT 'MEDIUM' COMMENT 'CLOSE_UP/MEDIUM/LONG/WIDE',
    camera_movement VARCHAR(20) DEFAULT 'FIXED' COMMENT 'FIXED/PUSH/PULL/PAN/TILT/FOLLOW',
    visual_description TEXT,
    narration_ref TEXT COMMENT '对应口播文案',
    transition VARCHAR(20) DEFAULT 'CUT' COMMENT 'CUT/DISSOLVE/SLIDE/ZOOM/FADE',
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    INDEX idx_project_order (project_id, sort_order)
) ENGINE=InnoDB;

-- 分镜图表
CREATE TABLE IF NOT EXISTS shot_images (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    shot_id BIGINT NOT NULL,
    project_id BIGINT NOT NULL,
    style VARCHAR(30) DEFAULT '真实摄影',
    prompt TEXT,
    negative_prompt TEXT,
    image_url VARCHAR(1000) COMMENT '本地存储路径',
    variants JSON DEFAULT NULL COMMENT '变体URL列表',
    status VARCHAR(20) DEFAULT 'pending' COMMENT 'pending/generating/done/rejected',
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (shot_id) REFERENCES storyboard_shots(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    INDEX idx_shot_status (shot_id, status)
) ENGINE=InnoDB;

-- 视频表
CREATE TABLE IF NOT EXISTS videos (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    project_id BIGINT NOT NULL,
    voice_type VARCHAR(30) DEFAULT '女-温柔',
    voice_speed DECIMAL(3,2) DEFAULT 1.00,
    voice_tone VARCHAR(20) DEFAULT '活泼',
    bgm_source VARCHAR(200) DEFAULT NULL,
    bgm_volume DECIMAL(3,2) DEFAULT 0.30,
    subtitle_style VARCHAR(30) DEFAULT '带货风',
    resolution VARCHAR(10) DEFAULT '1080P',
    aspect_ratio VARCHAR(10) DEFAULT '9:16',
    fps INT DEFAULT 30,
    output_format VARCHAR(10) DEFAULT 'MP4',
    video_url VARCHAR(1000) COMMENT '本地存储路径',
    file_size BIGINT DEFAULT 0,
    duration INT DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending' COMMENT 'pending/composing/done/failed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB;
