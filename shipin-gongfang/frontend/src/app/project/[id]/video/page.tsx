"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import type { Video } from "@/lib/types";

const VOICES = ["女-温柔", "女-活泼", "女-知性", "男-磁性", "男-活力", "男-沉稳", "东北话-女", "四川话-男", "粤语-女"];
const TONES = ["平铺直叙", "活泼", "沉稳", "激昂"];
const SUBTITLE_STYLES = ["带货风", "简约风", "综艺风", "清新风", "科技风"];
const PRESETS = [
  { name: "抖音", ratio: "9:16", resolution: "1080P" },
  { name: "小红书", ratio: "3:4", resolution: "1080P" },
  { name: "B站", ratio: "16:9", resolution: "1080P" },
  { name: "视频号", ratio: "9:16", resolution: "720P" },
];

export default function VideoPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const projectId = Number(id);

  const [video, setVideo] = useState<Video | null>(null);
  const [voiceType, setVoiceType] = useState("女-温柔");
  const [voiceSpeed, setVoiceSpeed] = useState(1.0);
  const [voiceTone, setVoiceTone] = useState("活泼");
  const [bgmSource, setBgmSource] = useState("轻快推荐");
  const [bgmVolume, setBgmVolume] = useState(0.3);
  const [subtitleStyle, setSubtitleStyle] = useState("带货风");
  const [preset, setPreset] = useState(PRESETS[0]);
  const [composing, setComposing] = useState(false);
  const [showExport, setShowExport] = useState(false);

  useEffect(() => {
    api.getVideo(projectId).then((d) => {
      if (d.video) {
        setVideo(d.video);
        if (d.video.status === "done") setShowExport(true);
      }
    }).catch(() => {});
  }, [projectId]);

  const handleCompose = async () => {
    setComposing(true);
    try {
      const data = await api.composeVideo(projectId, {
        voiceType, voiceSpeed, voiceTone, bgmSource, bgmVolume,
        subtitleStyle, resolution: preset.resolution, aspectRatio: preset.ratio,
        fps: 30, outputFormat: "MP4",
      } as Partial<Video>);
      setVideo(data.video);
      setShowExport(true);
    } catch (e) { alert("合成失败：" + (e as Error).message); }
    finally { setComposing(false); }
  };

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
          <span className="step-dot step-dot-done" /> 生图
          <span className="w-4 h-0.5 bg-[#6C5CE7]" />
          <span className="step-dot step-dot-active" /> 成片
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* 视频预览 */}
        <div className="col-span-2">
          <div className="video-preview-container aspect-[9/16] max-w-[400px] mx-auto flex items-center justify-center bg-black rounded-xl">
            {video?.status === "done" ? (
              <div className="text-center p-8">
                <div className="text-5xl mb-4">🎥</div>
                <div className="text-xl font-semibold mb-2">视频已生成</div>
                <div className="text-sm text-[#8888A0]">
                  {preset.resolution} · {video.fileSize ? `${(video.fileSize / 1024 / 1024).toFixed(1)} MB` : ""} · {video.duration}s
                </div>
              </div>
            ) : (
              <div className="text-center p-8">
                <div className="text-4xl mb-3">🎬</div>
                <div className="text-[#8888A0]">配置参数后合成视频</div>
              </div>
            )}
          </div>

          {/* 时间轴示意 */}
          <div className="glass-card mt-4">
            <div className="flex items-center gap-2 text-xs text-[#555568] mb-2">
              <span>视频轨</span>
              <div className="flex-1 h-6 rounded bg-white/[0.04] flex">
                {[1,2,3,4,5,6].map(i => (
                  <div key={i} className="border-r border-white/[0.06] flex-1" />
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-[#555568] mb-2">
              <span>音频轨</span>
              <div className="flex-1 h-4 rounded bg-white/[0.04]" />
            </div>
            <div className="flex items-center gap-2 text-xs text-[#555568]">
              <span>字幕轨</span>
              <div className="flex-1 h-4 rounded bg-white/[0.04]" />
            </div>
          </div>
        </div>

        {/* 参数面板 */}
        <div className="glass-card space-y-4">
          <h3 className="font-semibold text-sm">输出设置</h3>
          <div className="grid grid-cols-4 gap-2">
            {PRESETS.map((p) => (
              <button key={p.name}
                onClick={() => setPreset(p)}
                className={`p-2 rounded-lg text-xs text-center transition-all cursor-pointer ${
                  preset.name === p.name ? "border border-[#6C5CE7] bg-[#6C5CE7]/10 text-[#F0F0F5]" : "border border-white/[0.06] text-[#8888A0]"
                }`}
              >
                <div className="font-medium">{p.name}</div>
                <div className="text-[10px]">{p.ratio}</div>
              </button>
            ))}
          </div>

          <hr className="border-white/[0.06]" />
          <h3 className="font-semibold text-sm">配音设置</h3>
          <div>
            <label className="text-xs text-[#8888A0]">音色</label>
            <select className="select-base w-full mt-1" value={voiceType} onChange={(e) => setVoiceType(e.target.value)}>
              {VOICES.map((v) => <option key={v}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-[#8888A0]">语速：{voiceSpeed}x</label>
            <input type="range" min="0.5" max="2.0" step="0.1" value={voiceSpeed}
              onChange={(e) => setVoiceSpeed(Number(e.target.value))} className="accent-[#6C5CE7] w-full" />
          </div>
          <div>
            <label className="text-xs text-[#8888A0]">语调</label>
            <select className="select-base w-full mt-1" value={voiceTone} onChange={(e) => setVoiceTone(e.target.value)}>
              {TONES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>

          <hr className="border-white/[0.06]" />
          <h3 className="font-semibold text-sm">BGM</h3>
          <div>
            <select className="select-base w-full" value={bgmSource} onChange={(e) => setBgmSource(e.target.value)}>
              <option>轻快推荐</option><option>温暖治愈</option><option>科技潮流</option><option>激昂促销</option><option>无BGM</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-[#8888A0]">音量：{Math.round(bgmVolume * 100)}%</label>
            <input type="range" min="0" max="1.0" step="0.05" value={bgmVolume}
              onChange={(e) => setBgmVolume(Number(e.target.value))} className="accent-[#6C5CE7] w-full" />
          </div>

          <hr className="border-white/[0.06]" />
          <h3 className="font-semibold text-sm">字幕</h3>
          <select className="select-base w-full" value={subtitleStyle} onChange={(e) => setSubtitleStyle(e.target.value)}>
            {SUBTITLE_STYLES.map((s) => <option key={s}>{s}</option>)}
          </select>

          <button onClick={handleCompose} disabled={composing} className="btn-ai w-full justify-center mt-4 text-base py-3">
            {composing ? "⏳ 合成中..." : showExport ? "🔄 重新合成" : "🎥 合成视频"}
          </button>
        </div>
      </div>

      {/* 导出弹窗 */}
      {showExport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="modal-content max-w-sm w-full text-center">
            <div className="text-4xl mb-3">✨</div>
            <h3 className="text-lg font-semibold mb-2">视频已生成！</h3>
            <div className="text-sm text-[#8888A0] mb-2">
              MP4 · {preset.resolution} · {preset.ratio}
            </div>
            <div className="text-sm text-[#8888A0] mb-6">
              {video?.fileSize ? `${(video.fileSize / 1024 / 1024).toFixed(1)} MB · ` : ""}{video?.duration || 45}秒
            </div>
            <div className="flex gap-3 justify-center">
              <button className="btn-primary text-sm">📥 下载</button>
              <button className="btn-secondary text-sm" onClick={() => setShowExport(false)}>关闭</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
