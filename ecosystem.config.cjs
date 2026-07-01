// PM2 Ecosystem Config - UDAI WebApp Services
// Usage:
//   Start all:    pm2 start ecosystem.config.cjs
//   Stop all:     pm2 stop all
//   Status:       pm2 status
//   Logs:         pm2 logs
//   Auto-startup: pm2 startup && pm2 save

module.exports = {
  apps: [
    {
      name: "msg91-bridge",
      script: "src/server.js",
      cwd: "./msg91-bridge-service",
      interpreter: "node",
      watch: false,          // No watch mode - stable production run
      autorestart: true,     // Auto-restart if it crashes
      max_restarts: 10,
      restart_delay: 3000,
      env: {
        NODE_ENV: "production",
      },
    },
    {
      name: "admin-backend",
      script: "src/server.js",
      cwd: "./admin-main/backend",
      interpreter: "node",
      watch: false,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
      env: {
        NODE_ENV: "production",
      },
    },
    {
      name: "main-backend",
      script: "dist/server.js",         // TypeScript builds to dist/
      cwd: "./backend",
      interpreter: "node",
      watch: false,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
