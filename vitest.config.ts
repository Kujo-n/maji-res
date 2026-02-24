import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary", "lcov"],
      include: [
        "src/lib/**/*.ts",
        "src/app/api/**/*.ts",
      ],
      exclude: [
        "src/lib/firebase/**",
        "src/lib/auth-context.tsx",
        "src/lib/types/**",
        "src/lib/services/**",
        "src/lib/agents/base/**",
        "src/lib/agents/types.ts",
        "src/lib/agents/integrator.ts",
        "src/lib/agents/orchestrator.ts",
        "src/lib/agents/configurable-agent.ts",
        "src/app/api/chat/**",
        "src/**/*.test.ts",
      ],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 75,
        statements: 90,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
