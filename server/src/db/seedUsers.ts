import type { Client } from '@libsql/client';
import type { Logger } from 'pino';

/**
 * Seeds default user accounts (admin + test).
 * Does NOT delete existing users — caller decides whether to wipe first.
 */
export async function seedDefaultUsers(client: Client, logger: Logger): Promise<void> {
  const argon2 = await import('argon2');

  const adminPasswordHash = await argon2.default.hash('admin', { type: argon2.default.argon2id });
  const testPasswordHash = await argon2.default.hash('test123', { type: argon2.default.argon2id });

  await client.execute({
    sql: `INSERT INTO users (email, username, password_hash, role, failed_login_attempts, created_at, updated_at)
          VALUES (?, ?, ?, ?, 0, datetime('now'), datetime('now'))`,
    args: ['admin@gridfinity.local', 'admin', adminPasswordHash, 'admin'],
  });

  await client.execute({
    sql: `INSERT INTO users (email, username, password_hash, role, failed_login_attempts, created_at, updated_at)
          VALUES (?, ?, ?, ?, 0, datetime('now'), datetime('now'))`,
    args: ['test@gridfinity.local', 'test', testPasswordHash, 'user'],
  });

  logger.info('Created default accounts: admin@gridfinity.local, test@gridfinity.local');
  logger.warn('Change default passwords before deploying to production!');
}
