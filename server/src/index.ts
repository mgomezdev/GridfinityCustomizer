import { createApp } from './app.js';
import { config } from './config.js';
import { logger } from './logger.js';
import { client } from './db/connection.js';
import { runMigrations } from './db/migrate.js';
import { reseedLibraryData } from './db/reseedLibraries.js';

async function main(): Promise<void> {
  // Run migrations
  logger.info('Running database migrations...');
  await runMigrations(client);
  logger.info('Migrations complete');

  // Reseed library data from JSON files on every boot
  await reseedLibraryData(client, logger);

  // Seed default users on first boot only (when users table is empty)
  const userCount = await client.execute('SELECT COUNT(*) as count FROM users');
  if (Number(userCount.rows[0].count) === 0) {
    logger.info('No users found — seeding default accounts...');
    const { seedDefaultUsers } = await import('./db/seedUsers.js');
    await seedDefaultUsers(client, logger);
  }

  // Create and start app
  const app = createApp();

  const server = app.listen(config.PORT, () => {
    logger.info(`Server listening on port ${config.PORT} (${config.NODE_ENV})`);
  });

  // Graceful shutdown
  function shutdown(signal: string): void {
    logger.info(`Received ${signal}, shutting down gracefully...`);
    server.close(() => {
      logger.info('HTTP server closed');
      client.close();
      logger.info('Database connection closed');
      process.exit(0);
    });

    // Force exit after 10 seconds
    setTimeout(() => {
      logger.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  logger.fatal({ err }, 'Failed to start server');
  process.exit(1);
});
