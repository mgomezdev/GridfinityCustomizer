import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as layoutController from '../controllers/layout.controller.js';

const router = Router();

// All routes require authentication
router.use(requireAuth);

router.get('/', layoutController.listLayouts);
router.get('/:id', layoutController.getLayout);
router.post('/', layoutController.createLayout);
router.put('/:id', layoutController.updateLayout);
router.patch('/:id', layoutController.updateLayoutMeta);
router.delete('/:id', layoutController.deleteLayout);

export default router;
