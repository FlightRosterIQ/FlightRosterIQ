module.exports = {
  apps: [
    {
      name: "crew-schedule-app",
      script: "server-simple.cjs",
      env: {
        NODE_ENV: "development",
      },
      env_production: {
        NODE_ENV: "production",
      },
    },
  ],
};