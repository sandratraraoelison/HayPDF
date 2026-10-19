import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  build: { target: "es2022" },
  plugins: [
    react(),
    {
      name: "development-react-preamble-csp",
      apply: "serve",
      transformIndexHtml(html) {
        return html.replace(
          "script-src 'self' 'wasm-unsafe-eval'",
          "script-src 'self' 'wasm-unsafe-eval' 'unsafe-inline'",
        );
      },
    },
  ],
  base: "./",
  server: { host: "127.0.0.1", port: 5173, strictPort: true },
});
