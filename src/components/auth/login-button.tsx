"use client";

import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function LoginButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      router.push("/chat"); // ログイン後のリダイレクト先（仮）
      router.refresh(); // AuthState更新反映のため
    } catch (error) {
      console.error("Login failed", error);
      // TODO: Toast notification
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleLogin} disabled={loading}>
      {loading ? "Signing in..." : "Sign in with Google"}
    </Button>
  );
}
