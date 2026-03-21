import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  upload,
  processImageHandler,
  generateShadowboxHandler,
  listShadowboxesHandler,
  deleteShadowboxHandler,
} from '../controllers/shadowboxes.controller.js';

const router = Router();

// IMPORTANT: register literal path before /:id to prevent param collision
router.post('/process-image', requireAuth, upload.single('image'), processImageHandler);
router.post('/', requireAuth, generateShadowboxHandler);
router.get('/', requireAuth, listShadowboxesHandler);
router.delete('/:id', requireAuth, deleteShadowboxHandler);

export default router;
