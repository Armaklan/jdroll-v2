import Fastify from 'fastify';
import cors from '@fastify/cors';
import sensible from '@fastify/sensible';
import { registerAuthPlugin } from './plugins/auth.plugin.js';
import { authRoutes } from './controllers/auth.controller.js';
import { campaignRoutes } from './controllers/campaign.controller.js';

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: process.env.NODE_ENV === 'test' ? 'silent' : 'info',
    },
  });

  // Plugins
  await app.register(cors, {
    origin: true,
    credentials: true,
  });
  await app.register(sensible);
  await registerAuthPlugin(app);

  // Health check
  app.get('/api/health', async () => {
    return { status: 'ok', service: 'jdroll-api', timestamp: new Date().toISOString() };
  });

  // Routes
  await app.register(authRoutes);
  await app.register(campaignRoutes);

  return app;
}
