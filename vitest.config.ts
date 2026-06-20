import { resolve } from "path";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    exclude: [
      "**/node_modules/**",
      "**/.next/**",
      "**/e2e/**",
      "**/dist/**",
      "**/skills/**",
    ],
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "."),
    },
  },
});
