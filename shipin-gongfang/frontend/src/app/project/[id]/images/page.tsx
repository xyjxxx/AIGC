"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import type { ShotImage } from "@/lib/types";

const STYLES = ["真实摄影", "3D渲染", "扁平插画", "国潮风", "极简白底", "动漫风"];

export default function ImagesPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const projectId = Number(id);
  const [images, setImages] = useState<ShotImage[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [style, setStyle] = useState("真实摄影");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.getImages(projectId).then((d) => {
      if (d.images.length > 0) setImages(d.images);
    }).catch(() => {});
  }, [projectId]);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const data = await api.generateImages(projectId, style);
      setImages(data.images);
    } catch (e) { alert("生成失败：" + (e as Error).message); }
    finally { setLoading(false); }
  };

  const selectedImg = images.find((i) => i.id === selected);

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/project/${projectId}`} className="btn-ghost text-sm">← 返回项目</Link>
        <div className="flex items-center gap-1 text-sm text-[#8888A0]">
          <span className="step-dot step-dot-done" /> 素材
          <span className="w-4 h-0.5 bg-[#6C5CE7]" />
          <span className="step-dot step-dot-done" /> 脚本
          <span className="w-4 h-0.5 bg-[#6C5CE7]" />
          <span className="step-dot step-dot-done" /> 分镜
          <span className="w-4 h-0.5 bg-[#6C5CE7]" />
          <span className="step-dot step-dot-active" /> 生图
          <span className="w-4 h-0.5 bg-white/[0.08]" />
          <span className="step-dot step-dot-pending" /> 成片
        </div>
        <div className="ml-auto flex items-center gap-3">
          <select className="select-base" value={style} onChange={(e) => setStyle(e.target.value)}>
            {STYLES.map((s) => <option key={s}>{s}</option>)}
          </select>
          <button onClick={handleGenerate} disabled={loading} className="btn-ai text-sm">
            {loading ? "生成中..." : "批量生成全部 →"}
          </button>
        </div>
      </div>

      {images.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-4">🖼️</div>
          <p className="text-[#8888A0] mb-2">还没有分镜图</p>
          <p className="text-sm text-[#555568] mb-4">选择风格后点击「批量生成全部」为每个分镜创建画面</p>
          <button onClick={handleGenerate} disabled={loading} className="btn-ai">
            🖼️ 生成分镜图
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-12 gap-4">
          {/* 画廊 */}
          <div className="col-span-8 image-gallery-grid">
            {images.map((img) => (
              <div
                key={img.id}
                onClick={() => setSelected(img.id === selected ? null : img.id)}
                className={`image-card cursor-pointer ${img.id === selected ? "image-card selected" : ""}`}
                style={{
                  background: img.status === "done"
                    ? "linear-gradient(135deg, rgba(108,92,231,0.15) 0%, rgba(0,210,255,0.1) 100%)"
                    : "rgba(255,255,255,0.03)",
                }}
              >
                <div className="h-full flex flex-col items-center justify-center p-4 text-center">
                  <div className="text-3xl mb-2">{img.status === "done" ? "🖼️" : "⏳"}</div>
                  <div className="text-xs text-[#555568]">S{(img.sortOrder + 1).toString().padStart(2, "0")}</div>
                  <span className={`text-xs mt-1 ${img.status === "done" ? "tag-green" : "tag-orange"}`}>
                    {img.status === "done" ? "✓" : "生成中"}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* 详情面板 */}
          <div className="col-span-4">
            {selectedImg ? (
              <div className="glass-card space-y-4 sticky top-20">
                <div className="text-sm font-semibold">S{(selectedImg.sortOrder + 1).toString().padStart(2, "0")} 详情</div>
                <div>
                  <div className="text-xs text-[#8888A0] mb-1">Prompt</div>
                  <div className="text-sm p-3 rounded-lg bg-white/[0.04] font-mono text-xs leading-relaxed max-h-[200px] overflow-y-auto">
                    {selectedImg.prompt || "无"}
                  </div>
                </div>
                {selectedImg.negativePrompt && (
                  <div>
                    <div className="text-xs text-[#8888A0] mb-1">负向提示词</div>
                    <div className="text-xs p-2 rounded-lg bg-white/[0.04] text-[#555568]">{selectedImg.negativePrompt}</div>
                  </div>
                )}
                <div className="flex gap-2">
                  <button className="btn-secondary text-xs flex-1">重新生成</button>
                  <button className="btn-secondary text-xs flex-1">局部重绘</button>
                </div>
              </div>
            ) : (
              <div className="glass-card text-center py-12 text-[#555568] text-sm">
                点击左侧图片查看详情
              </div>
            )}
          </div>
        </div>
      )}

      {images.length > 0 && (
        <div className="flex justify-end mt-6 pt-6 border-t border-white/[0.06]">
          <button onClick={() => router.push(`/project/${projectId}/video`)} className="btn-ai">
            下一步 → 进入视频合成
          </button>
        </div>
      )}
    </div>
  );
}
