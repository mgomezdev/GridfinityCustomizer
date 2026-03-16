import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/admin.js';
import * as layoutController from '../controllers/layout.controller.js';

const router = Router();

// All admin routes require auth + admin role
router.use(requireAuth);
router.use(requireAdmin);

router.get('/admin/layouts', layoutController.listAdminLayouts);
router.get('/admin/layouts/count', layoutController.getSubmittedCount);
router.patch('/admin/layouts/:id/deliver', layoutController.deliverLayout);

export default router;
