/* API 客户端 — 与 FastAPI 后端通信 */
import type { Project, Script, StoryboardShot, ShotImage, Video, AIPlatformConfig } from './types';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    headers,
    ...options,
  });
  if (!res.ok) {
    let message = `请求失败 (HTTP ${res.status})`;
    try {
      const err = await res.json();
      // FastAPI 返回的 detail 可能是字符串或数组
      if (typeof err.detail === 'string') {
        message = err.detail;
      } else if (Array.isArray(err.detail)) {
        message = err.detail.map((e: Record<string, unknown>) => e.msg || JSON.stringify(e)).join('; ');
      } else if (err.message) {
        message = String(err.message);
      }
    } catch {}
    throw new Error(message);
  }
  return res.json();
}

// ===== 项目 =====
export const api = {
  // 项目
  listProjects: (status?: string) =>
    request<{ projects: Project[] }>(`/api/projects${status ? `?status=${status}` : ''}`),

  createProject: (name: string, targetPlatform = '抖音', targetDuration = 45, materialType?: string, materialData?: Record<string, unknown>) =>
    request<Project>(`/api/projects?name=${encodeURIComponent(name)}&target_platform=${targetPlatform}&target_duration=${targetDuration}${materialType ? `&material_type=${materialType}` : ''}`, {
      method: 'POST',
      body: materialData ? JSON.stringify(materialData) : undefined,
    }),

  getProject: (id: number) =>
    request<Project>(`/api/projects/${id}`),

  updateProject: (id: number, data: Partial<Project>) =>
    request<{ ok: boolean }>(`/api/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  deleteProject: (id: number) =>
    request<{ ok: boolean }>(`/api/projects/${id}`, { method: 'DELETE' }),

  // 脚本
  generateScript: (projectId: number, templateType: string, productFeatures?: string) =>
    request<{ scripts: Script[] }>(`/api/projects/${projectId}/scripts/generate`, {
      method: 'POST',
      body: JSON.stringify({ template_type: templateType, product_features: productFeatures }),
    }),

  getScripts: (projectId: number) =>
    request<{ scripts: Script[] }>(`/api/projects/${projectId}/scripts`),

  updateScript: (scriptId: number, data: Partial<Script>) =>
    request<{ ok: boolean }>(`/api/scripts/${scriptId}`, { method: 'PUT', body: JSON.stringify(data) }),

  aiRewrite: (scriptId: number, segmentId: number, action: string) =>
    request<{ text: string }>(`/api/scripts/${scriptId}/segments/${segmentId}/rewrite`, {
      method: 'POST', body: JSON.stringify({ action }),
    }),

  // 分镜
  generateStoryboard: (projectId: number, scriptId: number) =>
    request<{ shots: StoryboardShot[] }>(`/api/projects/${projectId}/storyboard/generate`, {
      method: 'POST', body: JSON.stringify({ script_id: scriptId }),
    }),

  getStoryboard: (projectId: number) =>
    request<{ shots: StoryboardShot[] }>(`/api/projects/${projectId}/storyboard`),

  updateShot: (shotId: number, data: Partial<StoryboardShot>) =>
    request<{ ok: boolean }>(`/api/shots/${shotId}`, { method: 'PUT', body: JSON.stringify(data) }),

  // 分镜图
  generateImages: (projectId: number, style: string) =>
    request<{ images: ShotImage[] }>(`/api/projects/${projectId}/images/generate`, {
      method: 'POST', body: JSON.stringify({ style }),
    }),

  getImages: (projectId: number) =>
    request<{ images: ShotImage[] }>(`/api/projects/${projectId}/images`),

  regenerateImage: (imageId: number) =>
    request<{ image: ShotImage }>(`/api/images/${imageId}/regenerate`, { method: 'POST' }),

  // 视频
  composeVideo: (projectId: number, config: Partial<Video>) =>
    request<{ video: Video }>(`/api/projects/${projectId}/video/compose`, {
      method: 'POST', body: JSON.stringify(config),
    }),

  getVideo: (projectId: number) =>
    request<{ video: Video }>(`/api/projects/${projectId}/video`),

  // AI 平台配置
  getAIConfig: () =>
    request<{ configs: AIPlatformConfig[] }>('/api/ai-platform/config'),

  saveAIConfig: (platform: string, apiToken: string) =>
    request<{ ok: boolean }>('/api/ai-platform/config', {
      method: 'POST', body: JSON.stringify({ platform, api_token: apiToken }),
    }),

  deleteAIConfig: (platform: string) =>
    request<{ ok: boolean }>(`/api/ai-platform/config/${platform}`, { method: 'DELETE' }),

  // 认证
  logout: () => request<{ ok: boolean }>('/api/auth/logout', { method: 'POST' }),

  // 管理员
  adminRegisterUser: (username: string, password: string, displayName: string) =>
    request<{ ok: boolean; user: Record<string, unknown> }>('/api/auth/admin/register-user', {
      method: 'POST', body: JSON.stringify({ username, password, display_name: displayName }),
    }),

  adminListUsers: () =>
    request<{ users: Array<{ id: number; username: string; displayName: string; role: string; isActive: boolean; createdAt: string }> }>('/api/auth/admin/users'),

  adminToggleUser: (userId: number) =>
    request<{ ok: boolean; isActive: boolean }>(`/api/auth/admin/users/${userId}/toggle`, { method: 'PUT' }),

  adminDeleteUser: (userId: number) =>
    request<{ ok: boolean }>(`/api/auth/admin/users/${userId}`, { method: 'DELETE' }),
};
