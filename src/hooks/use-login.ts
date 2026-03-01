"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithPopup, GoogleAuthProvider, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { getUserData } from "@/lib/firebase/users";

export function useLogin() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      if (user.email) {
        // Firestoreでユーザーステータスを確認
        const userData = await getUserData(user.email);

        if (!userData || userData.status === "pending") {
          // 未登録(DBに非存在)の場合は、トークンを取得してセキュアなBFFへ登録・通知を一括依頼
          if (!userData) {
            const idToken = await user.getIdToken();
            await fetch("/api/auth/register-pending", {
              method: "POST",
              headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${idToken}`
              },
            }).catch(err => console.error("Registration via BFF failed", err));
          }

          // 承認待ち案内を表示してサインアウト
          await signOut(auth);
          alert("アカウントは承認待ちです。\n管理者のアクティベートをお待ちください。");
          return;
        }
      }

      console.log("Sign in success:", result.user);
      router.push("/"); 
      router.refresh(); 
    } catch (error: unknown) {
      console.error("Login failed", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      alert(`Login failed: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return { handleLogin, loading };
}
