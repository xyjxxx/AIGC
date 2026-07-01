"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { Project } from "@/lib/types";

const TEMPLATES = [
  { name: "口播种草型", icon: "🎙️", desc: "达人视角推荐", color: "tag-purple", usage: "1.2k 使用" },
  { name: "痛点解决型", icon: "💡", desc: "问题→解决方案", color: "tag-orange", usage: "980 使用" },
  { name: "测评对比型", icon: "📊", desc: "实测对比反转", color: "tag-blue", usage: "890 使用" },
  { name: "场景种草型", icon: "🌿", desc: "氛围感植入", color: "tag-green", usage: "650 使用" },
];

const INPUT_METHODS = [
  { key: "link", icon: "🔗", label: "粘贴链接", desc: "商品链接自动解析" },
  { key: "image", icon: "🖼️", label: "上传图片", desc: "AI 视觉识别" },
  { key: "text", icon: "✏️", label: "手动输入", desc: "输入核心卖点" },
  { key: "document", icon: "📄", label: "文档上传", desc: "PDF/Word 解析" },
  { key: "csv", icon: "📊", label: "批量导入", desc: "CSV 批量生成" },
];

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  draft: { label: "草稿", cls: "tag-blue" },
  script: { label: "脚本编辑中", cls: "tag-orange" },
  storyboard: { label: "分镜设计中", cls: "tag-purple" },
  images: { label: "生图中", cls: "tag-orange" },
  video: { label: "视频合成中", cls: "tag-purple" },
  done: { label: "已完成", cls: "tag-green" },
};

export default function HomePage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [selectedMethod, setSelectedMethod] = useState("link");
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");

  const loadProjects = useCallback(async () => {
    try {
      const data = await api.listProjects();
      setProjects(data.projects);
    } catch { /* 后端未启动时显示空列表 */ }
  }, []);

  useEffect(() => { loadProjects(); }, [loadProjects]);

  const handleCreate = async () => {
    if (!createName.trim()) return;
    setLoading(true);
    try {
      const materialData = inputValue ? { type: selectedMethod, value: inputValue } : undefined;
      await api.createProject(createName, "抖音", 45, selectedMethod, materialData);
      setShowCreate(false); setCreateName(""); setInputValue("");
      await loadProjects();
      setToast("项目创建成功！");
      setTimeout(() => setToast(""), 3000);
    } catch (e) {
      alert("创建失败：" + (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {toast && (
        <div className="fixed top-20 right-6 z-[100] px-4 py-3 rounded-lg text-sm bg-[#1C1C2A] border border-[#00D68F]/30 shadow-lg animate-toast-in">
          ✅ {toast}
        </div>
      )}

      {/* 创建新项目区域 */}
      <div className="glass-card mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">✨ 创建新项目</h2>
          <button onClick={() => setShowCreate(!showCreate)} className="btn-ai text-sm">
            {showCreate ? "收起" : "快速开始"}
          </button>
        </div>

        {showCreate && (
          <div className="space-y-4 animate-toast-in">
            <div className="grid grid-cols-5 gap-3">
              {INPUT_METHODS.map((m) => (
                <button
                  key={m.key}
                  onClick={() => setSelectedMethod(m.key)}
                  className={`p-3 rounded-lg text-center transition-all cursor-pointer ${
                    selectedMethod === m.key
                      ? "border-2 border-[#6C5CE7] bg-[#6C5CE7]/10"
                      : "border border-white/[0.08] bg-white/[0.03] hover:border-white/[0.15]"
                  }`}
                >
                  <div className="text-2xl mb-1">{m.icon}</div>
                  <div className="text-sm font-medium">{m.label}</div>
                  <div className="text-xs text-[#8888A0]">{m.desc}</div>
                </button>
              ))}
            </div>

            <input
              className="input-base"
              placeholder="输入项目名称，如：防晒霜带货视频"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
            />

            {selectedMethod === "link" && (
              <input className="input-base" placeholder="粘贴商品链接（淘宝/京东/拼多多...）"
                value={inputValue} onChange={(e) => setInputValue(e.target.value)} />
            )}
            {selectedMethod === "text" && (
              <textarea className="input-base min-h-[80px] resize-y"
                placeholder={"输入商品名称和核心卖点（≥20字）\n例：XX防晒霜，SPF50+持久防护，清爽不油腻..."}
                value={inputValue} onChange={(e) => setInputValue(e.target.value)} />
            )}
            {(selectedMethod === "image" || selectedMethod === "document" || selectedMethod === "csv") && (
              <div className="border-2 border-dashed border-white/[0.1] rounded-lg p-8 text-center text-[#8888A0] hover:border-white/[0.2] transition-colors cursor-pointer">
                {selectedMethod === "image" && "🖼️ 点击或拖拽上传商品图片"}
                {selectedMethod === "document" && "📄 点击或拖拽上传 PDF / Word 文档"}
                {selectedMethod === "csv" && "📊 点击上传 CSV 文件（含商品名称、卖点列）"}
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button onClick={() => setShowCreate(false)} className="btn-ghost">取消</button>
              <button onClick={handleCreate} disabled={loading || !createName.trim()} className="btn-ai">
                {loading ? "创建中..." : "创建项目 →"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 最近项目 */}
      <h2 className="text-lg font-semibold mb-4">
        最近项目 <span className="text-sm font-normal text-[#8888A0]">({projects.length})</span>
      </h2>

      {projects.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">🎬</div>
          <div className="text-[#8888A0] mb-2">还没有项目</div>
          <div className="text-sm text-[#555568] mb-6">点击上方「快速开始」创建你的第一条 AI 带货视频</div>
          <button onClick={() => setShowCreate(true)} className="btn-ai">快速开始 →</button>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-4">
          {projects.map((p) => {
            const st = STATUS_MAP[p.status] || STATUS_MAP.draft;
            return (
              <Link key={p.id} href={`/project/${p.id}`}
                className="glass-card-interactive block no-underline">
                <div className="text-2xl mb-2">🎬</div>
                <div className="font-semibold text-sm mb-1">{p.name}</div>
                <div className="flex items-center gap-2 mb-3">
                  <span className={st.cls}>{st.label}</span>
                  <span className="text-xs text-[#555568]">{p.targetPlatform}</span>
                </div>
                <div className="ai-progress">
                  <div className="ai-progress-fill" style={{ width: `${(p.currentStep / 4) * 100}%` }} />
                </div>
                <div className="text-xs text-[#555568] mt-2">
                  {p.updatedAt ? new Date(p.updatedAt).toLocaleDateString("zh-CN") : ""}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* 推荐模板 */}
      <h2 className="text-lg font-semibold mt-10 mb-4">推荐模板</h2>
      <div className="grid grid-cols-4 gap-4">
        {TEMPLATES.map((t) => (
          <div key={t.name} className="glass-card-interactive">
            <div className="text-2xl mb-2">{t.icon}</div>
            <div className="font-semibold text-sm mb-1">{t.name}</div>
            <div className="text-xs text-[#8888A0] mb-3">{t.desc}</div>
            <span className={t.color}>{t.usage}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
