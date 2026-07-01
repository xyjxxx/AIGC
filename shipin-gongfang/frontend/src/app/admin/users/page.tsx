"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-store";

interface UserInfo {
  id: number; username: string; displayName: string;
  role: string; isActive: boolean; createdAt: string;
}

export default function AdminUsersPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState("");

  const loadUsers = useCallback(async () => {
    try {
      const data = await api.adminListUsers();
      setUsers(data.users);
    } catch {}
  }, []);

  useEffect(() => {
    if (user?.role !== "admin") { router.push("/"); return; }
    loadUsers();
  }, [user, router, loadUsers]);

  const handleCreate = async () => {
    if (!newUsername || !newPassword) return;
    setCreating(true);
    try {
      await api.adminRegisterUser(newUsername, newPassword, newDisplayName);
      setNewUsername(""); setNewPassword(""); setNewDisplayName("");
      setShowCreate(false);
      await loadUsers();
      setToast("用户创建成功！账号：" + newUsername);
      setTimeout(() => setToast(""), 3000);
    } catch (e) {
      alert((e as Error).message);
    } finally { setCreating(false); }
  };

  const handleToggle = async (userId: number) => {
    try {
      const data = await api.adminToggleUser(userId);
      setUsers(users.map(u => u.id === userId ? { ...u, isActive: data.isActive } : u));
    } catch {}
  };

  const handleDelete = async (userId: number, username: string) => {
    if (!confirm(`确定删除用户「${username}」？此操作不可恢复。`)) return;
    try {
      await api.adminDeleteUser(userId);
      setUsers(users.filter(u => u.id !== userId));
      setToast("用户已删除");
      setTimeout(() => setToast(""), 3000);
    } catch {}
  };

  return (
    <div>
      {toast && (
        <div className="fixed top-20 right-6 z-[100] px-4 py-3 rounded-lg text-sm bg-[#1C1C2A] border border-[#00D68F]/30 shadow-lg animate-toast-in">
          ✅ {toast}
        </div>
      )}

      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/" className="btn-ghost text-sm">← 返回首页</Link>
          <h1 className="text-xl font-semibold">用户管理</h1>
          <span className="tag-purple">管理员</span>
        </div>
        <button onClick={() => setShowCreate(!showCreate)} className="btn-ai text-sm">
          {showCreate ? "收起" : "＋ 注册新用户"}
        </button>
      </div>

      {showCreate && (
        <div className="glass-card mb-6 animate-toast-in">
          <h3 className="font-semibold mb-4">注册新用户</h3>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <input className="input-base" placeholder="用户名（登录用）"
              value={newUsername} onChange={(e) => setNewUsername(e.target.value)} />
            <input className="input-base" type="password" placeholder="密码（至少6位）"
              value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            <input className="input-base" placeholder="显示名称（可选）"
              value={newDisplayName} onChange={(e) => setNewDisplayName(e.target.value)} />
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setShowCreate(false)} className="btn-ghost">取消</button>
            <button onClick={handleCreate} disabled={creating} className="btn-primary">
              {creating ? "创建中..." : "创建用户"}
            </button>
          </div>
        </div>
      )}

      <div className="glass-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06] text-[#8888A0] text-left">
              <th className="py-3 px-4 font-medium">用户名</th>
              <th className="py-3 px-4 font-medium">显示名称</th>
              <th className="py-3 px-4 font-medium">角色</th>
              <th className="py-3 px-4 font-medium">状态</th>
              <th className="py-3 px-4 font-medium">创建时间</th>
              <th className="py-3 px-4 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                <td className="py-3 px-4 font-medium">{u.username}</td>
                <td className="py-3 px-4 text-[#8888A0]">{u.displayName}</td>
                <td className="py-3 px-4">
                  <span className={u.role === "admin" ? "tag-purple" : "tag-blue"}>{u.role}</span>
                </td>
                <td className="py-3 px-4">
                  <span className={u.isActive ? "tag-green" : "tag-orange"}>
                    {u.isActive ? "正常" : "已禁用"}
                  </span>
                </td>
                <td className="py-3 px-4 text-[#555568]">
                  {u.createdAt ? new Date(u.createdAt).toLocaleDateString("zh-CN") : ""}
                </td>
                <td className="py-3 px-4">
                  <div className="flex gap-2">
                    {u.role !== "admin" && (
                      <>
                        <button onClick={() => handleToggle(u.id)}
                          className="text-xs px-2 py-1 rounded bg-white/[0.06] hover:bg-white/[0.12] text-[#8888A0] transition-colors">
                          {u.isActive ? "禁用" : "启用"}
                        </button>
                        <button onClick={() => handleDelete(u.id, u.username)}
                          className="text-xs px-2 py-1 rounded bg-white/[0.06] hover:bg-[#FF6B6B]/20 text-[#FF6B6B] transition-colors">
                          删除
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td colSpan={6} className="py-12 text-center text-[#555568]">暂无用户</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
