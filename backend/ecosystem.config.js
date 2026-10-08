module.exports = {
  apps: [{
    name: 'businessapp',
    script: 'server.js',
    instances: 1,
    exec_mode: 'fork',
    max_memory_restart: '700M',
    env: {
      NODE_ENV: 'development',
      APP_ENV: 'local'
    },
    env_production: {
      NODE_ENV: 'production',
      APP_ENV: 'production'
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    time: true
  }]
};
