import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/admin.js';
import { listAllHandler, downloadStlHandler } from '../controllers/adminShadowboxes.controller.js';

const router = Router();

// All admin shadowbox routes require auth + admin role
router.get('/admin/shadowboxes', requireAuth, requireAdmin, listAllHandler);
router.get('/admin/shadowboxes/:id/stl', requireAuth, requireAdmin, downloadStlHandler);

export default router;
