import { buildApp } from './app.js';
import { config } from './config/env.js';
import { testConnection } from './db/mysql.js';
import { runMigrations } from './db/migrations.js';

async function start() {
  const app = await buildApp();

  // Test DB connection on startup
  const dbConnected = await testConnection();

  if (dbConnected) {
    try {
      const applied = await runMigrations();
      if (applied.length > 0) {
        console.log(`📦 Migrations appliquées : ${applied.map((m) => `v${m.id} (${m.name})`).join(', ')}`);
      }
    } catch (err) {
      console.error('❌ Échec des migrations de données, démarrage abandonné :', (err as Error).message);
      process.exit(1);
    }
  } else {
    console.warn('⚠️ Base de données indisponible : migrations de données ignorées.');
  }

  try {
    await app.listen({ port: config.port, host: config.host });
    console.log(`🚀 Fastify backend listening on http://${config.host}:${config.port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
