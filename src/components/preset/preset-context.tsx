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
  const [preset, setPresetState] = useState("default");
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
    fetch("/api/presets")
      .then((res) => res.json())
      .then((data) => {
        if (data.presets) {
          setAvailablePresets(data.presets);
        }
      })
      .catch((err) => console.error("Failed to fetch presets:", err))
      .finally(() => setIsLoading(false));
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
