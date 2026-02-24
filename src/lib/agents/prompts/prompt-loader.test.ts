import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "fs";

// Mock fs module
vi.mock("fs");

const MOCK_CONFIG = {
  provider: "google",
  defaultModel: "gemini-2.5-flash",
  agents: [
    { id: "melchior", name: "MELCHIOR", role: "科学者", promptFile: "melchior.md" },
    { id: "balthasar", name: "BALTHASAR", role: "母", promptFile: "balthasar.md" },
    { id: "casper", name: "CASPER", role: "女", promptFile: "casper.md" },
  ],
};

describe("prompt-loader", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    // Reset fs mock defaults
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(MOCK_CONFIG));
  });

  describe("sanitization - loadPresetConfig", () => {
    it("throws on preset name with path traversal", async () => {
      const { loadPresetConfig } = await import("./prompt-loader");
      expect(() => loadPresetConfig("../../etc")).toThrow();
    });

    it("throws on preset name with slash", async () => {
      const { loadPresetConfig } = await import("./prompt-loader");
      expect(() => loadPresetConfig("preset/hack")).toThrow();
    });

    it("throws on preset name with spaces", async () => {
      const { loadPresetConfig } = await import("./prompt-loader");
      expect(() => loadPresetConfig("my preset")).toThrow();
    });

    it("accepts valid preset names", async () => {
      const { loadPresetConfig } = await import("./prompt-loader");
      const config = loadPresetConfig("MAGI");
      expect(config.agents).toHaveLength(3);
    });

    it("accepts hyphenated preset names", async () => {
      const { loadPresetConfig } = await import("./prompt-loader");
      const config = loadPresetConfig("MAJI-RES");
      expect(config.agents).toHaveLength(3);
    });
  });

  describe("validation - config structure", () => {
    it("throws on config without agents array", async () => {
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ provider: "google" }));
      const { loadPresetConfig } = await import("./prompt-loader");
      expect(() => loadPresetConfig("MAGI")).toThrow();
    });

    it("throws on agent missing required fields", async () => {
      const badConfig = { agents: [{ id: "test" }] };
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(badConfig));
      const { loadPresetConfig } = await import("./prompt-loader");
      expect(() => loadPresetConfig("MAGI")).toThrow();
    });

    it("throws when promptFile contains path traversal", async () => {
      const badConfig = {
        agents: [{ id: "test", name: "TEST", promptFile: "../../../etc/passwd" }],
      };
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(badConfig));
      const { loadPresetConfig } = await import("./prompt-loader");
      expect(() => loadPresetConfig("MAGI")).toThrow();
    });
  });

  describe("sanitization - loadPresetPrompt", () => {
    it("throws on filename with path traversal", async () => {
      const { loadPresetPrompt } = await import("./prompt-loader");
      expect(() => loadPresetPrompt("../secret.md", "MAGI")).toThrow();
    });

    it("throws on filename with backslash", async () => {
      const { loadPresetPrompt } = await import("./prompt-loader");
      expect(() => loadPresetPrompt("..\\secret.md", "MAGI")).toThrow();
    });

    it("loads a valid prompt file", async () => {
      vi.mocked(fs.readFileSync).mockReturnValue("  prompt content  ");
      const { loadPresetPrompt } = await import("./prompt-loader");
      const content = loadPresetPrompt("melchior.md", "MAGI");
      expect(content).toBe("prompt content");
    });
  });

  describe("loadPresetPromptTemplate", () => {
    it("replaces template variables", async () => {
      vi.mocked(fs.readFileSync).mockReturnValue("Hello {{name}}, you are {{role}}.");
      const { loadPresetPromptTemplate } = await import("./prompt-loader");
      const result = loadPresetPromptTemplate(
        "template.md",
        { name: "Alice", role: "admin" },
        "MAGI"
      );
      expect(result).toBe("Hello Alice, you are admin.");
    });
  });

  describe("listPresets", () => {
    it("lists available presets", async () => {
      vi.mocked(fs.readdirSync).mockReturnValue([
        { name: "MAGI", isDirectory: () => true, isFile: () => false } as any,
        { name: "MAJI-RES", isDirectory: () => true, isFile: () => false } as any,
        { name: "prompt-loader.ts", isDirectory: () => false, isFile: () => true } as any,
      ]);
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(MOCK_CONFIG));

      const { listPresets } = await import("./prompt-loader");
      const presets = listPresets();
      expect(presets).toHaveLength(2);
    });

    it("skips directories without config.json", async () => {
      vi.mocked(fs.readdirSync).mockReturnValue([
        { name: "invalid", isDirectory: () => true, isFile: () => false } as any,
      ]);
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const { listPresets } = await import("./prompt-loader");
      const presets = listPresets();
      expect(presets).toHaveLength(0);
    });

    it("skips presets with invalid config", async () => {
      vi.mocked(fs.readdirSync).mockReturnValue([
        { name: "bad", isDirectory: () => true, isFile: () => false } as any,
      ]);
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue("invalid json");

      const { listPresets } = await import("./prompt-loader");
      const presets = listPresets();
      expect(presets).toHaveLength(0);
    });
  });

  describe("loadPrompt (shared)", () => {
    it("loads a shared prompt file", async () => {
      vi.mocked(fs.readFileSync).mockReturnValue("  shared prompt  ");
      const { loadPrompt } = await import("./prompt-loader");
      const content = loadPrompt("shared.md");
      expect(content).toBe("shared prompt");
    });

    it("throws on missing file", async () => {
      vi.mocked(fs.readFileSync).mockImplementation(() => {
        throw new Error("ENOENT");
      });
      const { loadPrompt } = await import("./prompt-loader");
      expect(() => loadPrompt("missing.md")).toThrow();
    });
  });

  describe("loadPromptTemplate (shared)", () => {
    it("replaces template variables", async () => {
      vi.mocked(fs.readFileSync).mockReturnValue("Hello {{name}}.");
      const { loadPromptTemplate } = await import("./prompt-loader");
      expect(loadPromptTemplate("tpl.md", { name: "World" })).toBe("Hello World.");
    });
  });

  describe("loadPresetPrompt error handling", () => {
    it("throws on file read error", async () => {
      vi.mocked(fs.readFileSync).mockImplementation(() => {
        throw new Error("ENOENT");
      });
      const { loadPresetPrompt } = await import("./prompt-loader");
      expect(() => loadPresetPrompt("missing.md", "MAGI")).toThrow();
    });
  });

  describe("loadPresetConfig caching", () => {
    it("returns cached config on second call", async () => {
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(MOCK_CONFIG));
      const { loadPresetConfig } = await import("./prompt-loader");
      loadPresetConfig("MAGI");
      // Second call should use cache
      const config = loadPresetConfig("MAGI");
      expect(config.agents).toHaveLength(3);
      // readFileSync should only be called once for this preset
      expect(fs.readFileSync).toHaveBeenCalledTimes(1);
    });
  });

  describe("loadPresetPrompt caching", () => {
    it("returns cached prompt on second call", async () => {
      vi.mocked(fs.readFileSync).mockReturnValue("cached prompt content");
      const { loadPresetPrompt } = await import("./prompt-loader");
      loadPresetPrompt("melchior.md", "MAGI");
      // Second call uses cache
      const content = loadPresetPrompt("melchior.md", "MAGI");
      expect(content).toBe("cached prompt content");
    });
  });

  describe("loadPrompt caching", () => {
    it("returns cached shared prompt on second call", async () => {
      vi.mocked(fs.readFileSync).mockReturnValue("shared cached");
      const { loadPrompt } = await import("./prompt-loader");
      loadPrompt("shared.md");
      const content = loadPrompt("shared.md");
      expect(content).toBe("shared cached");
    });
  });

  describe("sanitizeFilename edge cases", () => {
    it("throws on invalid filename format", async () => {
      vi.mocked(fs.readFileSync).mockReturnValue("content");
      const { loadPresetPrompt } = await import("./prompt-loader");
      expect(() => loadPresetPrompt("no-extension", "MAGI")).toThrow();
    });
  });
});
