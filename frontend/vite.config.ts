import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 3000,
    strictPort: true,
    watch: {
      usePolling: true,
      interval: 1000
    },
    proxy: {
      "/api": "http://backend:8080",
      "/socket.io": {
        target: "http://backend:8080",
        ws: true
      }
    }
  }
});
