import Fastify from 'fastify';
import cors from '@fastify/cors';
import sensible from '@fastify/sensible';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import fastifyWebsocket from '@fastify/websocket';
import fs from 'node:fs';
import { getFilesDirectory } from './storage/file-storage.js';
import { registerAuthPlugin } from './plugins/auth.plugin.js';
import { authRoutes } from './controllers/auth.controller.js';
import { campaignRoutes } from './controllers/campaign.controller.js';
import { notificationRoutes } from './controllers/notification.controller.js';
import { messageRoutes } from './controllers/message.controller.js';
import { carteRoutes } from './controllers/carte.controller.js';
import { chatRoutes } from './controllers/chat.controller.js';
import { notificationListener } from './listeners/notification.listener.js';

export async function buildApp() {
  // Initialize listeners
  notificationListener.register();

  const app = Fastify({
    logger: {
      level: process.env.NODE_ENV === 'test' ? 'silent' : 'info',
    },
  });

  // Support empty JSON bodies gracefully
  app.addContentTypeParser('application/json', { parseAs: 'string' }, (req, body, done) => {
    if (!body || (typeof body === 'string' && body.trim() === '')) {
      done(null, undefined);
      return;
    }
    try {
      const json = JSON.parse(body as string);
      done(null, json);
    } catch (err: any) {
      err.statusCode = 400;
      done(err, undefined);
    }
  });

  // Plugins
  await app.register(cors, {
    origin: true,
    credentials: true,
  });
  await app.register(sensible);
  await app.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10 Mo
    },
  });

  const filesDir = getFilesDirectory();
  if (!fs.existsSync(filesDir)) {
    fs.mkdirSync(filesDir, { recursive: true });
  }

  await app.register(fastifyStatic, {
    root: filesDir,
    prefix: '/files/',
    decorateReply: false,
  });

  await registerAuthPlugin(app);
  await app.register(fastifyWebsocket);

  // Health check
  app.get('/api/health', async () => {
    return { status: 'ok', service: 'jdroll-api', timestamp: new Date().toISOString() };
  });

  // Routes
  await app.register(authRoutes);
  await app.register(campaignRoutes);
  await app.register(carteRoutes);
  await app.register(notificationRoutes);
  await app.register(messageRoutes);
  await app.register(chatRoutes);

  return app;
}
