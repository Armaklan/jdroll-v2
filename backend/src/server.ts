import { buildApp } from './app.js';
import { config } from './config/env.js';
import { testConnection } from './db/mysql.js';

async function start() {
  const app = await buildApp();

  // Test DB connection on startup
  await testConnection();

  try {
    await app.listen({ port: config.port, host: config.host });
    console.log(`🚀 Fastify backend listening on http://${config.host}:${config.port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
