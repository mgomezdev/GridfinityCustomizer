import { Router } from 'express';
import { optionalAuth } from '../middleware/auth.js';
import * as bomController from '../controllers/bom.controller.js';

const router = Router();

// Optional auth - authenticated users get their userId linked
router.post('/submit', optionalAuth, bomController.submitBom);

// Public - download BOM JSON
router.get('/:id/download', bomController.downloadBom);

export default router;
