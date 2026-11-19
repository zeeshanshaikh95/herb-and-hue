import { createApp } from './app.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { config } from './config/env.js';
import { ensureAdminBootstrap } from './services/adminBootstrap.js';
import { seed } from './seed/seed.js';

async function main(): Promise<void> {
  await connectDatabase();
  await ensureAdminBootstrap();

  if (config.autoSeed) {
    await seed();
  }

  const app = createApp();
  const server = app.listen(config.port, () => {
    console.log(`[server] Herb & Hue API listening on http://localhost:${config.port} (${config.nodeEnv})`);
  });
  server.keepAliveTimeout = 61_000;
  server.headersTimeout = 65_000;

  const shutdown = (signal: string) => {
    console.log(`[server] ${signal} received — closing gracefully.`);
    server.close(() => {
      void disconnectDatabase().finally(() => process.exit(0));
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((error: unknown) => {
  console.error('[server] Failed to start:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
