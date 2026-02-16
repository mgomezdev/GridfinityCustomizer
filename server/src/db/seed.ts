import { createClient } from '@libsql/client';
import { resolve, dirname } from 'node:path';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import pino from 'pino';
import { runMigrations } from './migrate.js';
import { reseedLibraryData } from './reseedLibraries.js';
import { seedDefaultUsers } from './seedUsers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function seed(): Promise<void> {
  const logger = pino({ level: 'info' });

  // From server/src/db or server/dist/db -> 3 levels up = project root
  const projectRoot = resolve(__dirname, '..', '..', '..');
  const dbPath = process.env.DB_PATH ?? resolve(projectRoot, 'server', 'data', 'gridfinity.db');
  const dataDir = dirname(dbPath);

  // Ensure data directory exists
  mkdirSync(dataDir, { recursive: true });

  // Create database
  const client = createClient({ url: `file:${dbPath}` });

  // Run migrations
  await runMigrations(client);
  logger.info('Migrations complete');

  // Reseed library data from JSON files
  await reseedLibraryData(client, logger);

  // Full reset: wipe and reseed users
  await client.execute('DELETE FROM refresh_tokens;');
  await client.execute('DELETE FROM users;');
  await seedDefaultUsers(client, logger);

  logger.info('Seed complete!');
  client.close();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
