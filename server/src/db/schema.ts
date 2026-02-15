import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

export const libraries = sqliteTable('libraries', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  version: text('version').notNull().default('1.0.0'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: text('created_at').notNull().default(''),
  updatedAt: text('updated_at').notNull().default(''),
});

export const libraryItems = sqliteTable('library_items', {
  libraryId: text('library_id').notNull().references(() => libraries.id),
  id: text('id').notNull(),
  name: text('name').notNull(),
  widthUnits: integer('width_units').notNull(),
  heightUnits: integer('height_units').notNull(),
  color: text('color').notNull().default('#3B82F6'),
  imagePath: text('image_path'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: text('created_at').notNull().default(''),
  updatedAt: text('updated_at').notNull().default(''),
}, (table) => [
  primaryKey({ columns: [table.libraryId, table.id] }),
]);

export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  color: text('color'),
  sortOrder: integer('sort_order').notNull().default(0),
});

export const itemCategories = sqliteTable('item_categories', {
  libraryId: text('library_id').notNull(),
  itemId: text('item_id').notNull(),
  categoryId: text('category_id').notNull().references(() => categories.id),
}, (table) => [
  primaryKey({ columns: [table.libraryId, table.itemId, table.categoryId] }),
]);

// Relations
export const librariesRelations = relations(libraries, ({ many }) => ({
  items: many(libraryItems),
}));

export const libraryItemsRelations = relations(libraryItems, ({ one, many }) => ({
  library: one(libraries, {
    fields: [libraryItems.libraryId],
    references: [libraries.id],
  }),
  itemCategories: many(itemCategories),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  itemCategories: many(itemCategories),
}));

export const itemCategoriesRelations = relations(itemCategories, ({ one }) => ({
  category: one(categories, {
    fields: [itemCategories.categoryId],
    references: [categories.id],
  }),
  item: one(libraryItems, {
    fields: [itemCategories.libraryId, itemCategories.itemId],
    references: [libraryItems.libraryId, libraryItems.id],
  }),
}));
