import { sqliteTable, text, integer, real, primaryKey, index } from 'drizzle-orm/sqlite-core';
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
  perspectiveImagePath: text('perspective_image_path'),
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

// Auth tables
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull().default('user'),
  failedLoginAttempts: integer('failed_login_attempts').notNull().default(0),
  lockedUntil: text('locked_until'),
  createdAt: text('created_at').notNull().default(''),
  updatedAt: text('updated_at').notNull().default(''),
});

export const refreshTokens = sqliteTable('refresh_tokens', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  familyId: text('family_id').notNull(),
  tokenHash: text('token_hash').notNull().unique(),
  isRevoked: integer('is_revoked', { mode: 'boolean' }).notNull().default(false),
  expiresAt: text('expires_at').notNull(),
  createdAt: text('created_at').notNull().default(''),
}, (table) => [
  index('idx_refresh_tokens_family').on(table.familyId),
  index('idx_refresh_tokens_user').on(table.userId),
]);

// Layout tables
export const layouts = sqliteTable('layouts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  gridX: integer('grid_x').notNull(),
  gridY: integer('grid_y').notNull(),
  widthMm: real('width_mm').notNull(),
  depthMm: real('depth_mm').notNull(),
  spacerHorizontal: text('spacer_horizontal').notNull().default('none'),
  spacerVertical: text('spacer_vertical').notNull().default('none'),
  isPublic: integer('is_public', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull().default(''),
  updatedAt: text('updated_at').notNull().default(''),
}, (table) => [
  index('idx_layouts_user').on(table.userId),
]);

export const placedItems = sqliteTable('placed_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  layoutId: integer('layout_id').notNull().references(() => layouts.id, { onDelete: 'cascade' }),
  libraryId: text('library_id').notNull(),
  itemId: text('item_id').notNull(),
  x: integer('x').notNull(),
  y: integer('y').notNull(),
  width: integer('width').notNull(),
  height: integer('height').notNull(),
  rotation: integer('rotation').notNull().default(0),
  sortOrder: integer('sort_order').notNull().default(0),
}, (table) => [
  index('idx_placed_items_layout').on(table.layoutId),
]);

export const userStorage = sqliteTable('user_storage', {
  userId: integer('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  layoutCount: integer('layout_count').notNull().default(0),
  imageBytes: integer('image_bytes').notNull().default(0),
  maxLayouts: integer('max_layouts').notNull().default(50),
  maxImageBytes: integer('max_image_bytes').notNull().default(52428800),
});

// Reference images table
export const referenceImages = sqliteTable('reference_images', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  layoutId: integer('layout_id').notNull().references(() => layouts.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  filePath: text('file_path').notNull(),
  x: real('x').notNull().default(10),
  y: real('y').notNull().default(10),
  width: real('width').notNull().default(50),
  height: real('height').notNull().default(50),
  opacity: real('opacity').notNull().default(0.5),
  scale: real('scale').notNull().default(1.0),
  isLocked: integer('is_locked', { mode: 'boolean' }).notNull().default(false),
  rotation: integer('rotation').notNull().default(0),
  createdAt: text('created_at').notNull().default(''),
}, (table) => [
  index('idx_reference_images_layout').on(table.layoutId),
]);

// Sharing tables
export const sharedProjects = sqliteTable('shared_projects', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  layoutId: integer('layout_id').notNull().references(() => layouts.id, { onDelete: 'cascade' }),
  slug: text('slug').notNull().unique(),
  createdBy: integer('created_by').notNull().references(() => users.id),
  expiresAt: text('expires_at'),
  viewCount: integer('view_count').notNull().default(0),
  createdAt: text('created_at').notNull().default(''),
}, (table) => [
  index('idx_shared_projects_slug').on(table.slug),
]);

// BOM tables
export const bomSubmissions = sqliteTable('bom_submissions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  layoutId: integer('layout_id').references(() => layouts.id, { onDelete: 'set null' }),
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  gridX: integer('grid_x').notNull(),
  gridY: integer('grid_y').notNull(),
  widthMm: real('width_mm').notNull(),
  depthMm: real('depth_mm').notNull(),
  totalItems: integer('total_items').notNull(),
  totalUnique: integer('total_unique').notNull(),
  exportJson: text('export_json').notNull(),
  createdAt: text('created_at').notNull().default(''),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  refreshTokens: many(refreshTokens),
  layouts: many(layouts),
}));

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, {
    fields: [refreshTokens.userId],
    references: [users.id],
  }),
}));

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

export const layoutsRelations = relations(layouts, ({ one, many }) => ({
  user: one(users, {
    fields: [layouts.userId],
    references: [users.id],
  }),
  placedItems: many(placedItems),
  referenceImages: many(referenceImages),
}));

export const referenceImagesRelations = relations(referenceImages, ({ one }) => ({
  layout: one(layouts, {
    fields: [referenceImages.layoutId],
    references: [layouts.id],
  }),
}));

export const placedItemsRelations = relations(placedItems, ({ one }) => ({
  layout: one(layouts, {
    fields: [placedItems.layoutId],
    references: [layouts.id],
  }),
}));

export const userStorageRelations = relations(userStorage, ({ one }) => ({
  user: one(users, {
    fields: [userStorage.userId],
    references: [users.id],
  }),
}));

export const sharedProjectsRelations = relations(sharedProjects, ({ one }) => ({
  layout: one(layouts, {
    fields: [sharedProjects.layoutId],
    references: [layouts.id],
  }),
  creator: one(users, {
    fields: [sharedProjects.createdBy],
    references: [users.id],
  }),
}));

export const bomSubmissionsRelations = relations(bomSubmissions, ({ one }) => ({
  layout: one(layouts, {
    fields: [bomSubmissions.layoutId],
    references: [layouts.id],
  }),
  user: one(users, {
    fields: [bomSubmissions.userId],
    references: [users.id],
  }),
}));
