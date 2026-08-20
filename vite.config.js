import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { apiProxy } from "./vite-plugin-proxy.js";

export default defineConfig(({ mode }) => {
  // load ALL env (not just VITE_*) so the proxy can read the server-side keys
  const env = loadEnv(mode, process.cwd(), "");
  const TWELVEDATA_KEY = env.TWELVEDATA_KEY || env.VITE_TWELVEDATA_KEY || "";
  const ANTHROPIC_API_KEY = env.ANTHROPIC_API_KEY || "";
  return {
    plugins: [react(), tailwindcss(), apiProxy({ TWELVEDATA_KEY, ANTHROPIC_API_KEY })],
  };
});
