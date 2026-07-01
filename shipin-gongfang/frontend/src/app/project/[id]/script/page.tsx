"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import type { Project, Script } from "@/lib/types";

const TEMPLATES = ["口播种草型", "痛点解决型", "测评对比型", "场景种草型", "促销快闪型", "使用教程型"];
const PLATFORMS = ["抖音", "快手", "小红书", "视频号"];
const REWRITE_ACTIONS = [
  { key: "more_interesting", label: "更有趣" },
  { key: "more_professional", label: "更专业" },
  { key: "shorter", label: "更简短" },
  { key: "more_colloquial", label: "更口语化" },
];

export default function ScriptPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const projectId = Number(id);

  const [project, setProject] = useState<Project | null>(null);
  const [scripts, setScripts] = useState<Script[]>([]);
  const [selectedVersion, setSelectedVersion] = useState(0);
  const [template, setTemplate] = useState("口播种草型");
  const [platform, setPlatform] = useState("抖音");
  const [generating, setGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState(0);
  const [editingSegment, setEditingSegment] = useState<number | null>(null);

  useEffect(() => {
    api.getProject(projectId).then(setProject).catch(() => {});
  }, [projectId]);

  const handleGenerate = async () => {
    setGenerating(true);
    setGenProgress(0);
    const timer = setInterval(() => setGenProgress((p) => Math.min(p + Math.random() * 15, 95)), 400);

    try {
      const data = await api.generateScript(projectId, template);
      setScripts(data.scripts);
      setSelectedVersion(0);
      const selected = data.scripts[0];
      if (selected) {
        await api.updateProject(projectId, { currentStep: 1, status: "script" } as Partial<Project>);
        if (project) setProject({ ...project, currentStep: 1, status: "script" });
      }
    } catch (e) {
      alert("生成失败：" + (e as Error).message);
    } finally {
      clearInterval(timer);
      setGenProgress(100);
      setTimeout(() => { setGenerating(false); setGenProgress(0); }, 300);
    }
  };

  const handleAiRewrite = async (segmentId: number, action: string) => {
    if (scripts.length === 0) return;
    try {
      const result = await api.aiRewrite(scripts[selectedVersion].id, segmentId, action);
      const updated = [...scripts];
      const seg = updated[selectedVersion].segments.find((s) => s.id === segmentId);
      if (seg) seg.narration = result.text;
      setScripts(updated);
    } catch (e) {
      alert("改写失败：" + (e as Error).message);
    }
  };

  const currentScript = scripts[selectedVersion];

  return (
    <div>
      {/* 顶部导航 */}
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/project/${projectId}`} className="btn-ghost text-sm">← 返回项目</Link>
        <div className="flex items-center gap-1 text-sm text-[#8888A0]">
          <span className="step-dot step-dot-done" /> 素材
          <span className="w-4 h-0.5 bg-[#6C5CE7]" />
          <span className="step-dot step-dot-active" /> 脚本
          <span className="w-4 h-0.5 bg-white/[0.08]" />
          <span className="step-dot step-dot-pending" /> 分镜
          <span className="w-4 h-0.5 bg-white/[0.08]" />
          <span className="step-dot step-dot-pending" /> 生图
          <span className="w-4 h-0.5 bg-white/[0.08]" />
          <span className="step-dot step-dot-pending" /> 成片
        </div>
      </div>

      {/* 模板和平台选择 */}
      <div className="flex items-center gap-4 mb-6">
        <select className="select-base" value={template} onChange={(e) => setTemplate(e.target.value)}>
          {TEMPLATES.map((t) => <option key={t}>{t}</option>)}
        </select>
        <select className="select-base" value={platform} onChange={(e) => setPlatform(e.target.value)}>
          {PLATFORMS.map((p) => <option key={p}>{p}</option>)}
        </select>
        <span className="text-xs text-[#8888A0] ml-auto">
          {project?.aiPlatform === "doubao" ? "⚡ 豆包" : "⚡ OpenAI"}
        </span>
      </div>

      {/* 生成按钮 / 进度 */}
      {scripts.length === 0 && (
        <div className="text-center py-12 mb-6">
          <div className="text-4xl mb-4">📝</div>
          <p className="text-[#8888A0] mb-4">AI 将根据你的素材和选择的模板，生成 3 个版本的带货脚本</p>
          {generating ? (
            <div className="max-w-md mx-auto">
              <div className="ai-progress mb-2">
                <div className="ai-progress-fill" style={{ width: `${genProgress}%` }} />
              </div>
              <div className="text-sm text-[#8888A0]">
                ✨ AI 正在创作中... {Math.round(genProgress)}%
              </div>
            </div>
          ) : (
            <button onClick={handleGenerate} className="btn-ai text-base px-8 py-3">
              ✨ 生成脚本
            </button>
          )}
        </div>
      )}

      {/* 版本选择器 */}
      {scripts.length > 0 && (
        <>
          <div className="flex gap-3 mb-6">
            {scripts.map((s, i) => (
              <button
                key={i}
                onClick={() => setSelectedVersion(i)}
                className={`px-6 py-3 rounded-lg text-left transition-all cursor-pointer ${
                  i === selectedVersion
                    ? "border-2 border-[#6C5CE7] bg-[#6C5CE7]/10"
                    : "border border-white/[0.08] bg-white/[0.03]"
                }`}
              >
                <div className="font-semibold text-sm">
                  版本 {String.fromCharCode(65 + i)} {s.isSelected ? "⭐" : ""}
                </div>
                <div className="text-xs text-[#8888A0]">{s.templateType}</div>
                <div className="text-xs text-[#555568]">{s.totalDuration}秒</div>
              </button>
            ))}
          </div>

          {/* 脚本内容 */}
          {currentScript && (
            <div className="space-y-3">
              <h3 className="font-semibold text-base">{currentScript.title || "未命名脚本"}</h3>
              {currentScript.segments.map((seg) => (
                <div key={seg.id} className="glass-card relative group">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="tag-purple text-xs">
                      {seg.type === "opening" ? "🎬 开场" : seg.type === "closing" ? "🏁 结尾" : "📦 卖点"}
                    </span>
                    <span className="text-xs text-[#555568]">{seg.durationEstimate}s</span>
                    <div className="ml-auto flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {REWRITE_ACTIONS.map((a) => (
                        <button
                          key={a.key}
                          onClick={() => handleAiRewrite(seg.id!, a.key)}
                          className="text-xs px-2 py-1 rounded bg-white/[0.06] hover:bg-white/[0.12] text-[#8888A0] hover:text-[#F0F0F5] transition-colors"
                        >
                          ✨ {a.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-[#F0F0F5] leading-relaxed">{seg.narration}</p>
                  {seg.visualDescription && (
                    <p className="text-xs text-[#555568] mt-2">画面：{seg.visualDescription}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* 底部操作栏 */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/[0.06]">
            <div className="text-sm text-[#8888A0]">
              总时长：{currentScript?.totalDuration || 0}秒 | 字数：{currentScript?.totalWords || 0}字 | 合规检测：✅ 通过
            </div>
            <div className="flex gap-3">
              <button onClick={handleGenerate} className="btn-secondary">重新生成</button>
              <button
                onClick={() => router.push(`/project/${projectId}/storyboard`)}
                className="btn-ai"
              >
                下一步 → 分镜设计
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
