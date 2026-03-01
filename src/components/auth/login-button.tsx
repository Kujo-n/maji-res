"use client";

import { useLogin } from "@/hooks/use-login";
import { Button } from "@/components/ui/button";

export function LoginButton() {
  const { handleLogin, loading } = useLogin();

  return (
    <Button onClick={handleLogin} disabled={loading}>
      {loading ? "Signing in..." : "Sign in with Google"}
    </Button>
  );
}
