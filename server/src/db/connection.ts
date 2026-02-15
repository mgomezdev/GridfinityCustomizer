import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema.js';
import { config } from '../config.js';

const client = createClient({
  url: `file:${config.DB_PATH}`,
});

export const db = drizzle(client, { schema });
export { client };
