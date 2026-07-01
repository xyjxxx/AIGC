"use client";

import { create } from "zustand";
import { api } from "./api";

interface User {
  id: number;
  username: string;
  displayName: string;
  role: "admin" | "user";
}

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const useAuth = create<AuthState>((set) => ({
  user: null,
  token: null,
  loading: true,

  login: async (username: string, password: string) => {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "登录失败");
    }
    const data = await res.json();
    localStorage.setItem("auth_token", data.token);
    set({ user: data.user, token: data.token });
  },

  logout: async () => {
    try { await api.logout(); } catch {}
    localStorage.removeItem("auth_token");
    set({ user: null, token: null });
  },

  checkAuth: async () => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      set({ loading: false });
      return;
    }
    try {
      const res = await fetch(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      set({ user: data.user, token, loading: false });
    } catch {
      localStorage.removeItem("auth_token");
      set({ user: null, token: null, loading: false });
    }
  },
}));
