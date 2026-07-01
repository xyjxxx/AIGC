"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-store";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    setLoading(true); setError("");
    try {
      await login(username, password);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "登录失败");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-xl flex items-center justify-center text-xl mx-auto mb-4"
            style={{ background: "linear-gradient(135deg, #6C5CE7, #00D2FF)" }}>
            AI
          </div>
          <h1 className="text-xl font-bold">微创AI视频工坊</h1>
          <p className="text-sm text-[#8888A0] mt-1">登录你的账号</p>
        </div>

        <form onSubmit={handleLogin} className="glass-card space-y-4">
          <div>
            <label className="text-sm text-[#8888A0] block mb-1">用户名</label>
            <input className="input-base" placeholder="输入用户名"
              value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>
          <div>
            <label className="text-sm text-[#8888A0] block mb-1">密码</label>
            <input className="input-base" type="password" placeholder="输入密码"
              value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>

          {error && (
            <div className="text-sm text-[#FF6B6B] bg-[#FF6B6B]/10 px-3 py-2 rounded-lg">{error}</div>
          )}

          <button type="submit" disabled={loading} className="btn-ai w-full justify-center text-base py-3">
            {loading ? "登录中..." : "登录"}
          </button>

          <p className="text-xs text-[#555568] text-center">
            账号由管理员创建，请联系管理员获取
          </p>
        </form>
      </div>
    </div>
  );
}
