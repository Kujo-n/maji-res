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
      const result = await signInWithPopup(auth, provider);
      console.log("Sign in success:", result.user);
      router.push("/"); 
      router.refresh(); 
    } catch (error: unknown) {
      console.error("Login failed", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      alert(`Login failed: ${errorMessage}`); // Use alert for immediate visibility as toast might not be set up in this context
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
