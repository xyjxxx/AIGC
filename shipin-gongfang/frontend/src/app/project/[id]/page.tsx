"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import type { Project } from "@/lib/types";

const STEPS = [
  { key: 0, label: "素材", path: "" },
  { key: 1, label: "脚本", path: "/script" },
  { key: 2, label: "分镜", path: "/storyboard" },
  { key: 3, label: "生图", path: "/images" },
  { key: 4, label: "成片", path: "/video" },
];

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const projectId = Number(id);

  const loadProject = useCallback(async () => {
    try {
      const p = await api.getProject(projectId);
      setProject(p);
    } catch (e) {
      setError("项目不存在或加载失败");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { loadProject(); }, [loadProject]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-[#8888A0]">加载中...</div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="text-center py-32">
        <div className="text-5xl mb-4">⚠️</div>
        <div className="text-[#8888A0] mb-4">{error}</div>
        <Link href="/" className="btn-primary">返回首页</Link>
      </div>
    );
  }

  const currentStep = project.currentStep;

  return (
    <div>
      {/* 顶部：返回 + 步骤条 */}
      <div className="flex items-center gap-6 mb-8">
        <Link href="/" className="btn-ghost text-sm">
          ← 返回
        </Link>
        <div className="text-sm text-[#8888A0]">{project.name}</div>

        {/* 步骤条 */}
        <div className="flex items-center gap-0 flex-1 justify-center">
          {STEPS.map((step, i) => (
            <div key={step.key} className="flex items-center">
              {/* 连接线 */}
              {i > 0 && (
                <div className={`h-0.5 w-10 ${i <= currentStep ? "bg-[#6C5CE7]" : "bg-white/[0.08]"}`} />
              )}
              {/* 步骤点 */}
              <button
                onClick={() => {
                  if (step.key <= currentStep) {
                    router.push(`/project/${projectId}${step.path}`);
                  }
                }}
                disabled={step.key > currentStep}
                className={`flex items-center gap-2 px-2 py-1 rounded transition-all ${
                  step.key > currentStep ? "opacity-40 cursor-not-allowed" : "cursor-pointer hover:bg-white/[0.05]"
                }`}
              >
                <div
                  className={`w-3 h-3 rounded-full ${
                    step.key < currentStep ? "bg-[#6C5CE7]" :
                    step.key === currentStep ? "bg-[#6C5CE7]" : "bg-white/[0.12]"
                  }`}
                  style={step.key === currentStep ? {
                    boxShadow: "0 0 12px rgba(108,92,231,0.6)",
                    animation: "step-pulse 2s infinite",
                  } : {}}
                />
                <span className={`text-xs ${step.key === currentStep ? "text-[#F0F0F5]" : "text-[#555568]"}`}>
                  {step.label}
                </span>
              </button>
            </div>
          ))}
        </div>

        {/* 项目信息 */}
        <div className="flex items-center gap-3 text-xs text-[#8888A0] shrink-0">
          <span>目标：{project.targetPlatform}</span>
          <span>时长：{project.targetDuration}s</span>
          {project.aiPlatform && <span className="tag-purple">{project.aiPlatform === "openai" ? "OpenAI" : "豆包"}</span>}
        </div>
      </div>

      {/* 模块内容引导 */}
      <div className="glass-card text-center py-16">
        <div className="text-5xl mb-4">
          {currentStep === 0 ? "📦" : currentStep === 1 ? "📝" : currentStep === 2 ? "🎬" : currentStep === 3 ? "🖼️" : "🎥"}
        </div>
        <h2 className="text-xl font-semibold mb-2">
          {currentStep === 0 && "开始导入素材"}
          {currentStep === 1 && "进入脚本编辑"}
          {currentStep === 2 && "进入分镜设计"}
          {currentStep === 3 && "进入分镜图生成"}
          {currentStep === 4 && "进入视频合成"}
        </h2>
        <p className="text-[#8888A0] mb-6">
          {currentStep === 0 && "选择一种方式导入商品素材，AI 将自动解析商品信息"}
          {currentStep === 1 && "点击下方进入脚本编辑页面，AI 已为你生成多版本脚本"}
          {currentStep === 2 && "点击下方进入分镜画板，查看和调整分镜设计"}
          {currentStep === 3 && "点击下方进入分镜图生成，为每个分镜创建画面"}
          {currentStep === 4 && "点击下方进入视频合成，配置配音、字幕、BGM"}
        </p>
        <button
          onClick={() => router.push(`/project/${projectId}${STEPS[currentStep].path}`)}
          className="btn-ai"
        >
          进入{STEPS[currentStep].label}模块 →
        </button>
      </div>
    </div>
  );
}
