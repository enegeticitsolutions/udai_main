import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5191,
    proxy: {
      "/api": {
        target: "http://localhost:5003",
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on("error", (err, _req, res) => {
            if (res && !res.headersSent && typeof res.writeHead === "function") {
              res.writeHead(502, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ success: false, message: "Admin backend service unavailable or starting up" }));
            }
          });
        },
      },
    },
  },
});
