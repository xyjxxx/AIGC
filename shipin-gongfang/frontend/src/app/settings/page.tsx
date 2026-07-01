"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { AIPlatformConfig } from "@/lib/types";

export default function SettingsPage() {
  const [configs, setConfigs] = useState<AIPlatformConfig[]>([]);
  const [showOpenAI, setShowOpenAI] = useState(false);
  const [showDoubao, setShowDoubao] = useState(false);
  const [apiToken, setApiToken] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  const loadConfig = async () => {
    try {
      const data = await api.getAIConfig();
      setConfigs(data.configs);
    } catch { /* 后端未启动 */ }
  };

  useEffect(() => { loadConfig(); }, []);

  const openaiConfig = configs.find((c) => c.platform === "openai");
  const doubaoConfig = configs.find((c) => c.platform === "doubao");

  const handleSave = async (platform: string) => {
    if (!apiToken.trim()) return;
    setSaving(true);
    try {
      await api.saveAIConfig(platform, apiToken);
      setApiToken("");
      setShowOpenAI(false);
      setShowDoubao(false);
      await loadConfig();
      setToast(`${platform === "openai" ? "OpenAI" : "豆包"} 配置成功！`);
      setTimeout(() => setToast(""), 3000);
    } catch (e) {
      alert("保存失败：" + (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (platform: string) => {
    try {
      await api.deleteAIConfig(platform);
      await loadConfig();
      setToast(`${platform === "openai" ? "OpenAI" : "豆包"} 已断开连接`);
      setTimeout(() => setToast(""), 3000);
    } catch { /* */ }
  };

  return (
    <div>
      {toast && (
        <div className="fixed top-20 right-6 z-[100] px-4 py-3 rounded-lg text-sm bg-[#1C1C2A] border border-[#00D68F]/30 shadow-lg animate-toast-in">
          ✅ {toast}
        </div>
      )}

      <div className="flex items-center gap-4 mb-8">
        <Link href="/" className="btn-ghost text-sm">← 返回</Link>
        <h1 className="text-xl font-semibold">设置</h1>
      </div>

      {/* AI 平台选择 */}
      <div className="glass-card mb-8">
        <h2 className="text-lg font-semibold mb-2">AI 平台选择</h2>
        <p className="text-sm text-[#8888A0] mb-6">
          选择一个 AI 平台，脚本生成、分镜生图、视频AI 将全部使用该平台。使用你自己的 API 账号，费用由你掌控。
        </p>

        <div className="grid grid-cols-2 gap-4">
          {/* OpenAI */}
          <div className={`rounded-xl p-5 border transition-all ${
            openaiConfig?.isActive
              ? "border-[#6C5CE7] bg-[#6C5CE7]/5"
              : "border-white/[0.08] bg-white/[0.02]"
          }`}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg bg-white/[0.08]">
                ⚡
              </div>
              <div>
                <div className="font-semibold">OpenAI</div>
                <div className="text-xs text-[#8888A0]">Codex · DALL·E</div>
              </div>
              {openaiConfig?.isActive && <span className="tag-green ml-auto">● 使用中</span>}
            </div>

            {openaiConfig?.hasToken ? (
              <div className="space-y-2">
                <div className="text-xs text-[#8888A0]">✅ 已连接</div>
                <div className="flex gap-2">
                  <button onClick={() => { setShowOpenAI(true); setShowDoubao(false); }} className="btn-ghost text-xs">
                    更换账号
                  </button>
                  <button onClick={() => handleDelete("openai")} className="btn-ghost text-xs text-[#FF6B6B]">
                    断开连接
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => { setShowOpenAI(true); setShowDoubao(false); }} className="btn-secondary text-sm">
                连接账号
              </button>
            )}

            {showOpenAI && (
              <div className="mt-4 space-y-3 animate-toast-in">
                <input
                  className="input-base"
                  type="password"
                  placeholder="输入 OpenAI API Key (sk-...)"
                  value={apiToken}
                  onChange={(e) => setApiToken(e.target.value)}
                />
                <div className="flex gap-2">
                  <button onClick={() => handleSave("openai")} disabled={saving} className="btn-primary text-sm">
                    {saving ? "保存中..." : "保存"}
                  </button>
                  <button onClick={() => setShowOpenAI(false)} className="btn-ghost text-sm">取消</button>
                </div>
                <p className="text-xs text-[#555568]">API Key 将使用 AES-256 加密存储，平台不保存明文</p>
              </div>
            )}
          </div>

          {/* 字节豆包 */}
          <div className={`rounded-xl p-5 border transition-all ${
            doubaoConfig?.isActive
              ? "border-[#6C5CE7] bg-[#6C5CE7]/5"
              : "border-white/[0.08] bg-white/[0.02]"
          }`}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg bg-white/[0.08]">
                🫘
              </div>
              <div>
                <div className="font-semibold">字节豆包</div>
                <div className="text-xs text-[#8888A0]">Doubao 大模型</div>
              </div>
              {doubaoConfig?.isActive && <span className="tag-green ml-auto">● 使用中</span>}
            </div>

            {doubaoConfig?.hasToken ? (
              <div className="space-y-2">
                <div className="text-xs text-[#8888A0]">✅ 已连接</div>
                <div className="flex gap-2">
                  <button onClick={() => { setShowDoubao(true); setShowOpenAI(false); }} className="btn-ghost text-xs">
                    更换账号
                  </button>
                  <button onClick={() => handleDelete("doubao")} className="btn-ghost text-xs text-[#FF6B6B]">
                    断开连接
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => { setShowDoubao(true); setShowOpenAI(false); }} className="btn-secondary text-sm">
                连接账号
              </button>
            )}

            {showDoubao && (
              <div className="mt-4 space-y-3 animate-toast-in">
                <input
                  className="input-base"
                  type="password"
                  placeholder="输入豆包 API Key"
                  value={apiToken}
                  onChange={(e) => setApiToken(e.target.value)}
                />
                <div className="flex gap-2">
                  <button onClick={() => handleSave("doubao")} disabled={saving} className="btn-primary text-sm">
                    {saving ? "保存中..." : "保存"}
                  </button>
                  <button onClick={() => setShowDoubao(false)} className="btn-ghost text-sm">取消</button>
                </div>
                <p className="text-xs text-[#555568]">API Key 将使用 AES-256 加密存储，平台不保存明文</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 默认偏好 */}
      <div className="glass-card">
        <h2 className="text-lg font-semibold mb-4">默认偏好</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-[#8888A0] block mb-1">默认模板</label>
            <select className="select-base w-full">
              <option>口播种草型</option>
              <option>痛点解决型</option>
              <option>测评对比型</option>
              <option>场景种草型</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-[#8888A0] block mb-1">默认平台</label>
            <select className="select-base w-full">
              <option>抖音</option>
              <option>快手</option>
              <option>小红书</option>
              <option>视频号</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-[#8888A0] block mb-1">默认风格</label>
            <select className="select-base w-full">
              <option>真实摄影</option>
              <option>3D渲染</option>
              <option>扁平插画</option>
              <option>国潮风</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-[#8888A0] block mb-1">默认分辨率</label>
            <select className="select-base w-full">
              <option>1080P</option>
              <option>720P</option>
              <option>2K</option>
              <option>4K</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
