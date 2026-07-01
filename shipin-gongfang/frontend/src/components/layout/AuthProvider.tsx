"use client";

import { useEffect } from "react";
import { useAuth } from "@/lib/auth-store";

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const { checkAuth } = useAuth();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return <>{children}</>;
}
