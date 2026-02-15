import { Router } from 'express';
import * as controller from '../controllers/library.controller.js';

const router = Router();

// GET /libraries - List all libraries
router.get('/', controller.listLibraries);

// GET /libraries/:id - Get single library
router.get('/:id', controller.getLibrary);

// GET /libraries/:libraryId/items - List items in a library
router.get('/:libraryId/items', controller.listLibraryItems);

// GET /libraries/:libraryId/items/:itemId - Get single item
router.get('/:libraryId/items/:itemId', controller.getLibraryItem);

export default router;
