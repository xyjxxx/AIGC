/* 微创AI带货视频工坊 — 类型定义 */

// ===== 项目 =====
export interface Project {
  id: number;
  name: string;
  targetPlatform: string;
  targetDuration: number;
  status: 'draft' | 'script' | 'storyboard' | 'images' | 'video' | 'done';
  currentStep: number; // 0-4
  aiPlatform?: string;
  materialType?: string;
  materialData?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

// ===== 脚本 =====
export type SegmentType = 'opening' | 'body' | 'closing';
export type TemplateType = '痛点解决型' | '测评对比型' | '使用教程型' | '场景种草型' | '口播种草型' | '促销快闪型';

export interface ScriptSegment {
  id?: number;
  scriptId?: number;
  type: SegmentType;
  narration: string;
  visualDescription: string;
  durationEstimate: number;
  sortOrder: number;
}

export interface Script {
  id: number;
  projectId: number;
  version: number;
  templateType?: TemplateType;
  title?: string;
  totalDuration: number;
  totalWords: number;
  tags?: string[];
  isSelected: boolean;
  segments: ScriptSegment[];
}

// ===== 分镜 =====
export type SceneType = 'CLOSE_UP' | 'MEDIUM' | 'LONG' | 'WIDE';
export type CameraMovement = 'FIXED' | 'PUSH' | 'PULL' | 'PAN' | 'TILT' | 'FOLLOW';
export type TransitionType = 'CUT' | 'DISSOLVE' | 'SLIDE' | 'ZOOM' | 'FADE';

export interface StoryboardShot {
  id: number;
  projectId: number;
  shotNumber: number;
  duration: number;
  sceneType: SceneType;
  cameraMovement: CameraMovement;
  visualDescription: string;
  narrationRef: string;
  transition: TransitionType;
  sortOrder: number;
  images?: ShotImage[];
}

// ===== 分镜图 =====
export type ImageStyle = '真实摄影' | '3D渲染' | '扁平插画' | '国潮风' | '极简白底' | '动漫风';

export interface ShotImage {
  id: number;
  shotId: number;
  projectId: number;
  style: ImageStyle;
  prompt?: string;
  negativePrompt?: string;
  imageUrl?: string;
  variants?: string[];
  status: 'pending' | 'generating' | 'done' | 'rejected';
  sortOrder: number;
}

// ===== 视频 =====
export interface Video {
  id: number;
  projectId: number;
  voiceType: string;
  voiceSpeed: number;
  voiceTone: string;
  bgmSource?: string;
  bgmVolume: number;
  subtitleStyle: string;
  resolution: string;
  aspectRatio: string;
  fps: number;
  outputFormat: string;
  videoUrl?: string;
  fileSize: number;
  duration: number;
  status: 'pending' | 'composing' | 'done' | 'failed';
}

// ===== AI 平台 =====
export type AIPlatform = 'openai' | 'doubao';

export interface AIPlatformConfig {
  id?: number;
  platform: AIPlatform;
  hasToken: boolean; // 是否已配置token（不返回实际token）
  isActive: boolean;
}

// ===== API 响应 =====
export interface ApiResponse<T> {
  ok?: boolean;
  error?: string;
  [key: string]: unknown;
}
