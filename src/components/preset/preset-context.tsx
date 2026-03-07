"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

interface PresetContextType {
  preset: string;
  setPreset: (preset: string) => void;
  availablePresets: { name: string; config: any }[];
  isLoading: boolean;
}

const PresetContext = createContext<PresetContextType | undefined>(undefined);

export function PresetProvider({ children }: { children: React.ReactNode }) {
  const [preset, setPresetState] = useState("MAGI");
  const [availablePresets, setAvailablePresets] = useState<{ name: string; config: any }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load saved preset from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("magi_preset");
    if (saved) {
      setPresetState(saved);
    }
  }, []);

  // Fetch available presets
  useEffect(() => {
    let isMounted = true;
    
    const fetchPresets = async () => {
      try {
        // Firebase Auth から現在のユーザーとトークンを取得
        // preset-contextはトップレベルに近い場所で使われるため、authが初期化されるのを待つか、
        // 取得できなくてもフォールバックさせるなどの実装が必要です。
        // ※ 本来は useAuth() フック等で既に取得済みの getIdToken() を使用するのがベストです。
        // ここでは、/api/presets 側の verifyAuth() に対応するためヘッダ追加の形をとります。
        
        const { auth } = await import("@/lib/firebase/client");
        
        // ユーザーが取得できるまで少し待つ（onAuthStateChanged 等を使うのが確実だが、
        // シンプルにするため現在のcurrentUserを取得）
        let token = "";
        if (auth.currentUser) {
           token = await auth.currentUser.getIdToken();
        }

        const headers: Record<string, string> = {
          "Content-Type": "application/json"
        };
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        const res = await fetch("/api/presets", { headers });
        if (!res.ok) {
          throw new Error(`Failed to fetch: ${res.status}`);
        }
        const data = await res.json();
        
        if (isMounted && data.presets) {
          setAvailablePresets(data.presets);
        }
      } catch (err) {
        console.error("Failed to fetch presets:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    
    // Authの状態解決を確約させるため、Firebaseのリスナーを使う
    const initFetch = async () => {
      const { auth } = await import("@/lib/firebase/client");
      const unsubscribe = auth.onIdTokenChanged(async (user) => {
        if (user) {
          await fetchPresets();
        } else {
          // 未ログイン時はどうするか（一応公開不要APIの場合空にする等）
          setIsLoading(false);
        }
      });
      return unsubscribe;
    };
    
    let unsub: (() => void) | undefined;
    initFetch().then(u => unsub = u);

    return () => {
      isMounted = false;
      if (unsub) unsub();
    };
  }, []);

  const setPreset = (newPreset: string) => {
    setPresetState(newPreset);
    localStorage.setItem("magi_preset", newPreset);
  };

  return (
    <PresetContext.Provider value={{ preset, setPreset, availablePresets, isLoading }}>
      {children}
    </PresetContext.Provider>
  );
}

export function usePreset() {
  const context = useContext(PresetContext);
  if (context === undefined) {
    throw new Error("usePreset must be used within a PresetProvider");
  }
  return context;
}
