import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// `npm run dev` proxies /api to the Python backend (default :8000), so the UI
// hot-reloads while talking to a real (or mock) TV.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  server: {
    host: true,
    proxy: { "/api": process.env.API_URL ?? "http://localhost:8000" },
  },
  build: { chunkSizeWarningLimit: 800 },
});
