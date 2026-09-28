import { Router } from 'express';
import { siteController } from '../controllers/site.controller.js';
import { validate } from '../middlewares/validate.middleware.js';
import { siteIdParamSchema } from '../validators/site.validator.js';

const router = Router();

router.get('/', siteController.getAll);
router.get('/:id', validate({ params: siteIdParamSchema }), siteController.getById);
router.get('/:id/summary', validate({ params: siteIdParamSchema }), siteController.getSummary);

export default router;
