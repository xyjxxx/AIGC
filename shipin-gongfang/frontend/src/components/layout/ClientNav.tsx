"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-store";

export default function ClientNav() {
  const { user, logout, loading } = useAuth();
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);

  if (loading) {
    return (
      <nav className="h-14 border-b border-white/[0.06] bg-[#0A0A0F]/95 backdrop-blur-md sticky top-0 z-50 flex items-center px-6">
        <div className="flex items-center gap-8 max-w-[1400px] mx-auto w-full">
          <Link href="/" className="flex items-center gap-2 font-bold text-base text-white no-underline shrink-0">
            <span className="w-7 h-7 rounded-lg flex items-center justify-center text-sm"
              style={{ background: "linear-gradient(135deg, #6C5CE7, #00D2FF)" }}>AI</span>
            微创AI视频工坊
          </Link>
          <div className="flex-1" />
        </div>
      </nav>
    );
  }

  return (
    <nav className="h-14 border-b border-white/[0.06] bg-[#0A0A0F]/95 backdrop-blur-md sticky top-0 z-50 flex items-center px-6">
      <div className="flex items-center gap-8 max-w-[1400px] mx-auto w-full">
        <Link href="/" className="flex items-center gap-2 font-bold text-base text-white no-underline shrink-0">
          <span className="w-7 h-7 rounded-lg flex items-center justify-center text-sm"
            style={{ background: "linear-gradient(135deg, #6C5CE7, #00D2FF)" }}>AI</span>
          微创AI视频工坊
        </Link>

        {user && (
          <div className="flex items-center gap-1">
            <Link href="/" className="px-3 py-1.5 rounded-md text-sm text-[#F0F0F5] bg-white/[0.06]">项目</Link>
            <Link href="/templates" className="px-3 py-1.5 rounded-md text-sm text-[#8888A0] hover:text-[#F0F0F5] transition-colors">模板库</Link>
            {user.role === "admin" && (
              <Link href="/admin/users" className="px-3 py-1.5 rounded-md text-sm text-[#8888A0] hover:text-[#F0F0F5] transition-colors">用户管理</Link>
            )}
          </div>
        )}

        <div className="ml-auto flex items-center gap-3">
          {user ? (
            <>
              <Link href="/settings" className="p-2 rounded-lg text-[#8888A0] hover:text-[#F0F0F5] hover:bg-white/[0.05] transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
              </Link>
              <div className="relative">
                <button onClick={() => setShowMenu(!showMenu)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold cursor-pointer"
                  style={{ background: user.role === "admin" ? "linear-gradient(135deg, #FF6B6B, #FFB347)" : "linear-gradient(135deg, #6C5CE7, #00D2FF)" }}>
                  {user.displayName[0]?.toUpperCase() || "U"}
                </button>
                {showMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                    <div className="absolute right-0 top-10 z-50 w-48 py-2 rounded-lg border border-white/[0.08] bg-[#1C1C2A] shadow-lg">
                      <div className="px-4 py-2 border-b border-white/[0.06]">
                        <div className="text-sm font-medium">{user.displayName}</div>
                        <div className="text-xs text-[#8888A0]">{user.role === "admin" ? "管理员" : "用户"}</div>
                      </div>
                      <button onClick={() => { router.push("/settings"); setShowMenu(false); }}
                        className="w-full text-left px-4 py-2 text-sm text-[#8888A0] hover:bg-white/[0.05] transition-colors">
                        设置
                      </button>
                      <button onClick={() => { logout(); setShowMenu(false); }}
                        className="w-full text-left px-4 py-2 text-sm text-[#FF6B6B] hover:bg-white/[0.05] transition-colors">
                        退出登录
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            <Link href="/login" className="btn-primary text-sm">登录</Link>
          )}
        </div>
      </div>
    </nav>
  );
}
