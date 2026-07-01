"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import type { StoryboardShot } from "@/lib/types";

const SCENE_LABELS: Record<string, string> = { CLOSE_UP: "特写", MEDIUM: "近景", LONG: "中景", WIDE: "远景" };
const CAMERA_LABELS: Record<string, string> = { FIXED: "固定", PUSH: "推", PULL: "拉", PAN: "摇", TILT: "跟", FOLLOW: "跟" };

export default function StoryboardPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const projectId = Number(id);
  const [shots, setShots] = useState<StoryboardShot[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.getStoryboard(projectId).then((d) => {
      if (d.shots.length > 0) setShots(d.shots);
    }).catch(() => {});
  }, [projectId]);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const data = await api.generateStoryboard(projectId, 0);
      setShots(data.shots);
      if (data.shots.length > 0) setSelected(data.shots[0].id);
    } catch (e) { alert("生成失败：" + (e as Error).message); }
    finally { setLoading(false); }
  };

  const selectedShot = shots.find((s) => s.id === selected);

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/project/${projectId}`} className="btn-ghost text-sm">← 返回项目</Link>
        <div className="flex items-center gap-1 text-sm text-[#8888A0]">
          <span className="step-dot step-dot-done" /> 素材
          <span className="w-4 h-0.5 bg-[#6C5CE7]" />
          <span className="step-dot step-dot-done" /> 脚本
          <span className="w-4 h-0.5 bg-[#6C5CE7]" />
          <span className="step-dot step-dot-active" /> 分镜
          <span className="w-4 h-0.5 bg-white/[0.08]" />
          <span className="step-dot step-dot-pending" /> 生图
          <span className="w-4 h-0.5 bg-white/[0.08]" />
          <span className="step-dot step-dot-pending" /> 成片
        </div>
      </div>

      {shots.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-4">🎬</div>
          <p className="text-[#8888A0] mb-4">AI 将脚本自动拆解为分镜序列</p>
          <button onClick={handleGenerate} disabled={loading} className="btn-ai">
            {loading ? "生成中..." : "✨ 自动拆解分镜"}
          </button>
        </div>
      ) : (
        <>
          {/* 时间线 */}
          <div className="glass-card mb-4 overflow-x-auto">
            <div className="flex items-center gap-2 min-w-max pb-2">
              {shots.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelected(s.id)}
                  className={`shot-card flex flex-col items-start min-w-[80px] ${s.id === selected ? "shot-card-selected" : ""}`}
                >
                  <span className="font-bold text-[#6C5CE7] text-xs">S{s.shotNumber.toString().padStart(2, "0")}</span>
                  <span className="text-[#F0F0F5]">{s.duration}s</span>
                  <span className="text-[#555568]">{SCENE_LABELS[s.sceneType] || s.sceneType}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 选中分镜详情 */}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 glass-card">
              {selectedShot && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="tag-purple text-sm">S{selectedShot.shotNumber.toString().padStart(2, "0")}</span>
                    <div className="flex items-center gap-2 text-sm">
                      <span>时长：</span>
                      <input type="range" min="1" max="30" step="0.5" value={selectedShot.duration}
                        className="accent-[#6C5CE7] w-32"
                        onChange={() => {}} />
                      <span>{selectedShot.duration}s</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-[#8888A0] block mb-1">画面描述</label>
                    <div className="input-base bg-white/[0.04] min-h-[60px]">{selectedShot.visualDescription}</div>
                  </div>
                  <div>
                    <label className="text-xs text-[#8888A0] block mb-1">对应口播</label>
                    <div className="text-sm text-[#F0F0F5] p-3 rounded-lg bg-white/[0.03]">{selectedShot.narrationRef}</div>
                  </div>
                </div>
              )}
            </div>

            <div className="glass-card space-y-3">
              <h3 className="font-semibold text-sm">属性设置</h3>
              {selectedShot && (
                <>
                  <div>
                    <label className="text-xs text-[#8888A0]">景别</label>
                    <select className="select-base w-full mt-1" value={selectedShot.sceneType}>
                      {Object.entries(SCENE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-[#8888A0]">运镜</label>
                    <select className="select-base w-full mt-1" value={selectedShot.cameraMovement}>
                      {Object.entries(CAMERA_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-[#8888A0]">转场</label>
                    <select className="select-base w-full mt-1" value={selectedShot.transition}>
                      <option>CUT</option><option>DISSOLVE</option><option>SLIDE</option><option>ZOOM</option><option>FADE</option>
                    </select>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex justify-between mt-6 pt-6 border-t border-white/[0.06]">
            <div className="glass-card text-sm text-[#8888A0] px-3 py-2">
              💡 近景占比 {(shots.filter(s => s.sceneType === "MEDIUM").length / shots.length * 100).toFixed(0)}%，建议增加1个远景丰富节奏
            </div>
            <button onClick={() => router.push(`/project/${projectId}/images`)} className="btn-ai">
              下一步 → 生成分镜图
            </button>
          </div>
        </>
      )}
    </div>
  );
}
