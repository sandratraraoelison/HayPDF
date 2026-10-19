import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";
const packageInfo = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf8"),
);
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(packageInfo.version),
    __APP_AUTHOR__: JSON.stringify(packageInfo.author),
  },
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
