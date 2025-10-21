module.exports = {
  apps: [
    {
      name: 'bom-strapi',
      cwd: '/root/bom/backend',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        HOST: '0.0.0.0',
        PORT: 1337,
      },
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      autorestart: true,
      max_memory_restart: '1G',
      error_file: '/var/log/pm2/strapi-error.log',
      out_file: '/var/log/pm2/strapi-out.log',
      log_file: '/var/log/pm2/strapi-combined.log',
      time: true,
    },
  ],
};