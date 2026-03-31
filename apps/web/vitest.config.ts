import { resolve } from "node:path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: /^@lobehub\/icons\/es\/.*$/u,
        replacement: resolve(__dirname, "src/test-utils/lobehubIconStub.tsx"),
      },
    ],
  },
  test: {
    environment: "jsdom",
  },
});
