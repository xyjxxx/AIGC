"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { AIPlatformConfig } from "@/lib/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function SettingsPage() {
  const [configs, setConfigs] = useState<AIPlatformConfig[]>([]);
  const [toast, setToast] = useState("");
  const [connecting, setConnecting] = useState("");

  const loadConfig = useCallback(async () => {
    try {
      const data = await api.getAIConfig();
      setConfigs(data.configs);
    } catch {}
  }, []);

  useEffect(() => { loadConfig(); }, [loadConfig]);

  const handleConnect = (platform: string) => {
    setConnecting(platform);
    // 跳转到平台OAuth授权页面
    window.location.href = `${API_URL}/api/auth/oauth/authorize?platform=${platform}`;
  };

  const handleDisconnect = async (platform: string) => {
    try {
      await api.deleteAIConfig(platform);
      await loadConfig();
      setToast(`${platform === "openai" ? "OpenAI" : "豆包"} 已断开连接`);
      setTimeout(() => setToast(""), 3000);
    } catch {}
  };

  const openaiConfig = configs.find((c) => c.platform === "openai");
  const doubaoConfig = configs.find((c) => c.platform === "doubao");

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
        <h2 className="text-lg font-semibold mb-2">AI 平台授权</h2>
        <p className="text-sm text-[#8888A0] mb-6">
          登录你的 AI 平台账号授权，脚本生成、分镜生图、视频AI 将通过你的账号调用大模型。
          平台不接触你的密码，授权后可随时撤销。
        </p>

        <div className="grid grid-cols-2 gap-4">
          {/* OpenAI */}
          <div className={`rounded-xl p-5 border transition-all ${
            openaiConfig?.isActive
              ? "border-[#6C5CE7] bg-[#6C5CE7]/5"
              : "border-white/[0.08] bg-white/[0.02]"
          }`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
                style={{ background: "linear-gradient(135deg, #10A37F, #1A7F64)" }}>
                O
              </div>
              <div>
                <div className="font-semibold">OpenAI</div>
                <div className="text-xs text-[#8888A0]">Codex · GPT · DALL·E</div>
              </div>
              {openaiConfig?.isActive && <span className="tag-green ml-auto">● 已授权</span>}
            </div>

            {openaiConfig?.hasToken ? (
              <div className="space-y-2">
                <div className="text-xs text-[#8888A0]">✅ 账号已授权，AI 调用通过你的 OpenAI 账号进行</div>
                <button onClick={() => handleDisconnect("openai")} className="btn-ghost text-xs text-[#FF6B6B]">
                  撤销授权
                </button>
              </div>
            ) : (
              <button
                onClick={() => handleConnect("openai")}
                disabled={connecting === "openai"}
                className="btn-secondary text-sm w-full justify-center"
              >
                {connecting === "openai" ? "跳转中..." : "🔑 登录 OpenAI 账号授权"}
              </button>
            )}
          </div>

          {/* 字节豆包 */}
          <div className={`rounded-xl p-5 border transition-all ${
            doubaoConfig?.isActive
              ? "border-[#6C5CE7] bg-[#6C5CE7]/5"
              : "border-white/[0.08] bg-white/[0.02]"
          }`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
                style={{ background: "linear-gradient(135deg, #3370FF, #1A47CC)" }}>
                豆
              </div>
              <div>
                <div className="font-semibold">字节豆包</div>
                <div className="text-xs text-[#8888A0]">Doubao 大模型</div>
              </div>
              {doubaoConfig?.isActive && <span className="tag-green ml-auto">● 已授权</span>}
            </div>

            {doubaoConfig?.hasToken ? (
              <div className="space-y-2">
                <div className="text-xs text-[#8888A0]">✅ 账号已授权，AI 调用通过你的豆包账号进行</div>
                <button onClick={() => handleDisconnect("doubao")} className="btn-ghost text-xs text-[#FF6B6B]">
                  撤销授权
                </button>
              </div>
            ) : (
              <button
                onClick={() => handleConnect("doubao")}
                disabled={connecting === "doubao"}
                className="btn-secondary text-sm w-full justify-center"
              >
                {connecting === "doubao" ? "跳转中..." : "🔑 登录豆包账号授权"}
              </button>
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
              <option>口播种草型</option><option>痛点解决型</option><option>测评对比型</option><option>场景种草型</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-[#8888A0] block mb-1">默认平台</label>
            <select className="select-base w-full">
              <option>抖音</option><option>快手</option><option>小红书</option><option>视频号</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-[#8888A0] block mb-1">默认风格</label>
            <select className="select-base w-full">
              <option>真实摄影</option><option>3D渲染</option><option>扁平插画</option><option>国潮风</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-[#8888A0] block mb-1">默认分辨率</label>
            <select className="select-base w-full">
              <option>1080P</option><option>720P</option><option>2K</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
