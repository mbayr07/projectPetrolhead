import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  server: {
    port: 3000,
    // IMPORTANT: use IPv4 to avoid localhost/::1 weirdness on some Macs
    proxy: {
      "/api": {
        target: "http://127.0.0.1:5174",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});