import type { Client } from '@libsql/client';

export async function runMigrations(client: Client): Promise<void> {
  await client.execute('PRAGMA foreign_keys = ON;');
  await client.execute('PRAGMA busy_timeout = 5000;');

  await client.execute(`
    CREATE TABLE IF NOT EXISTS libraries (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      version TEXT NOT NULL DEFAULT '1.0.0',
      is_active INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT ''
    );
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS library_items (
      library_id TEXT NOT NULL REFERENCES libraries(id),
      id TEXT NOT NULL,
      name TEXT NOT NULL,
      width_units INTEGER NOT NULL,
      height_units INTEGER NOT NULL,
      color TEXT NOT NULL DEFAULT '#3B82F6',
      image_path TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT '',
      PRIMARY KEY (library_id, id)
    );
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0
    );
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS item_categories (
      library_id TEXT NOT NULL,
      item_id TEXT NOT NULL,
      category_id TEXT NOT NULL REFERENCES categories(id),
      PRIMARY KEY (library_id, item_id, category_id)
    );
  `);

  await client.execute(`
    CREATE INDEX IF NOT EXISTS idx_library_items_library_id ON library_items(library_id);
  `);

  await client.execute(`
    CREATE INDEX IF NOT EXISTS idx_item_categories_category_id ON item_categories(category_id);
  `);

  await client.execute(`
    CREATE INDEX IF NOT EXISTS idx_item_categories_item ON item_categories(library_id, item_id);
  `);
}
