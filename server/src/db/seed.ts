import { createClient } from '@libsql/client';
import { readFileSync, existsSync, mkdirSync, copyFileSync } from 'node:fs';
import { resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import argon2 from 'argon2';
import { runMigrations } from './migrate.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface ManifestLibrary {
  id: string;
  name: string;
  path: string;
}

interface Manifest {
  version: string;
  libraries: ManifestLibrary[];
}

interface LibraryItemJson {
  id: string;
  name: string;
  widthUnits: number;
  heightUnits: number;
  color: string;
  categories: string[];
  imageUrl?: string;
}

interface LibraryIndex {
  version: string;
  items: LibraryItemJson[];
}

const CATEGORY_COLORS: Record<string, string> = {
  bin: '#3B82F6',
  labeled: '#8B5CF6',
  utensil: '#10B981',
  modular: '#F59E0B',
};

function getCategoryName(id: string): string {
  return id.charAt(0).toUpperCase() + id.slice(1);
}

async function seed(): Promise<void> {
  const projectRoot = resolve(__dirname, '..', '..', '..');
  const publicDir = resolve(projectRoot, 'public');
  const serverDir = resolve(__dirname, '..', '..');
  const dataDir = resolve(serverDir, 'data');
  const imageDir = resolve(dataDir, 'images');
  const dbPath = resolve(dataDir, 'gridfinity.db');

  // Ensure directories exist
  mkdirSync(dataDir, { recursive: true });
  mkdirSync(imageDir, { recursive: true });

  // Read manifest
  const manifestPath = resolve(publicDir, 'libraries', 'manifest.json');
  if (!existsSync(manifestPath)) {
    console.error(`Manifest not found at: ${manifestPath}`);
    process.exit(1);
  }

  const manifest: Manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
  console.log(`Found ${manifest.libraries.length} libraries in manifest`);

  // Create database
  const client = createClient({ url: `file:${dbPath}` });

  // Run migrations
  await runMigrations(client);
  console.log('Migrations complete');

  // Clear existing data (in reverse order due to foreign keys)
  await client.execute('DELETE FROM item_categories;');
  await client.execute('DELETE FROM library_items;');
  await client.execute('DELETE FROM categories;');
  await client.execute('DELETE FROM libraries;');
  console.log('Cleared existing data');

  const allCategories = new Set<string>();
  const now = new Date().toISOString();

  // Process each library
  for (let libIdx = 0; libIdx < manifest.libraries.length; libIdx++) {
    const lib = manifest.libraries[libIdx];
    const libDir = resolve(publicDir, 'libraries', lib.id);
    const indexPath = resolve(libDir, 'index.json');

    if (!existsSync(indexPath)) {
      console.warn(`Library index not found: ${indexPath}, skipping`);
      continue;
    }

    const libIndex: LibraryIndex = JSON.parse(readFileSync(indexPath, 'utf-8'));
    console.log(`Processing library: ${lib.name} (${libIndex.items.length} items)`);

    // Insert library
    await client.execute({
      sql: `INSERT INTO libraries (id, name, description, version, is_active, sort_order, created_at, updated_at)
            VALUES (?, ?, ?, ?, 1, ?, ?, ?)`,
      args: [lib.id, lib.name, null, libIndex.version, libIdx, now, now],
    });

    // Process items
    for (let itemIdx = 0; itemIdx < libIndex.items.length; itemIdx++) {
      const item = libIndex.items[itemIdx];

      // Collect categories
      for (const cat of item.categories) {
        allCategories.add(cat);
      }

      // Handle image copying
      let imagePath: string | null = null;
      if (item.imageUrl) {
        // Determine source path
        let sourceImagePath: string;
        if (item.imageUrl.startsWith('/')) {
          // Absolute path relative to public directory
          sourceImagePath = resolve(publicDir, item.imageUrl.slice(1));
        } else {
          // Relative path from the library directory
          sourceImagePath = resolve(libDir, item.imageUrl);
        }

        if (existsSync(sourceImagePath)) {
          const destDir = resolve(imageDir, lib.id);
          mkdirSync(destDir, { recursive: true });
          const destFilename = basename(sourceImagePath);
          const destPath = resolve(destDir, destFilename);
          copyFileSync(sourceImagePath, destPath);
          imagePath = `${lib.id}/${destFilename}`;
        } else {
          console.warn(`Image not found: ${sourceImagePath}`);
        }
      }

      // Insert item
      await client.execute({
        sql: `INSERT INTO library_items (library_id, id, name, width_units, height_units, color, image_path, is_active, sort_order, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`,
        args: [lib.id, item.id, item.name, item.widthUnits, item.heightUnits, item.color, imagePath, itemIdx, now, now],
      });

      // Insert item-category associations (deferred until categories are inserted)
    }
  }

  // Insert categories
  const sortedCategories = Array.from(allCategories).sort();
  for (let i = 0; i < sortedCategories.length; i++) {
    const catId = sortedCategories[i];
    await client.execute({
      sql: `INSERT INTO categories (id, name, color, sort_order) VALUES (?, ?, ?, ?)`,
      args: [catId, getCategoryName(catId), CATEGORY_COLORS[catId] ?? null, i],
    });
  }
  console.log(`Inserted ${sortedCategories.length} categories: ${sortedCategories.join(', ')}`);

  // Now insert item_categories junction entries
  for (const lib of manifest.libraries) {
    const libDir = resolve(publicDir, 'libraries', lib.id);
    const indexPath = resolve(libDir, 'index.json');
    if (!existsSync(indexPath)) continue;

    const libIndex: LibraryIndex = JSON.parse(readFileSync(indexPath, 'utf-8'));

    for (const item of libIndex.items) {
      for (const catId of item.categories) {
        await client.execute({
          sql: `INSERT INTO item_categories (library_id, item_id, category_id) VALUES (?, ?, ?)`,
          args: [lib.id, item.id, catId],
        });
      }
    }
  }

  // Seed default user accounts
  console.log('');
  console.log('Seeding default user accounts...');

  // Clear existing users (cascade will handle refresh_tokens)
  await client.execute('DELETE FROM refresh_tokens;');
  await client.execute('DELETE FROM users;');

  const adminPasswordHash = await argon2.hash('admin', { type: argon2.argon2id });
  const testPasswordHash = await argon2.hash('test123', { type: argon2.argon2id });

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

  console.log('  Created admin account: admin@gridfinity.local / admin');
  console.log('  Created test account: test@gridfinity.local / test123');
  console.log('  WARNING: Change default passwords before deploying to production!');

  console.log('');
  console.log('Seed complete!');

  // Print summary
  const libCount = await client.execute('SELECT COUNT(*) as count FROM libraries');
  const itemCount = await client.execute('SELECT COUNT(*) as count FROM library_items');
  const catCount = await client.execute('SELECT COUNT(*) as count FROM categories');
  const junctionCount = await client.execute('SELECT COUNT(*) as count FROM item_categories');
  const userCount = await client.execute('SELECT COUNT(*) as count FROM users');

  console.log(`Summary:`);
  console.log(`  Libraries: ${libCount.rows[0].count}`);
  console.log(`  Items: ${itemCount.rows[0].count}`);
  console.log(`  Categories: ${catCount.rows[0].count}`);
  console.log(`  Item-Category links: ${junctionCount.rows[0].count}`);
  console.log(`  Users: ${userCount.rows[0].count}`);

  client.close();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
