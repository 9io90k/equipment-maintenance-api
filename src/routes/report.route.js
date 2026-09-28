import { Router } from 'express';
import { reportController } from '../controllers/report.controller.js';
import { validate } from '../middlewares/validate.middleware.js';
import { equipmentLoadReportQuerySchema } from '../validators/report.validator.js';

const router = Router();

router.get(
  '/equipment-load',
  validate({ query: equipmentLoadReportQuerySchema }),
  reportController.getEquipmentLoadReport
);

router.get(
  '/maintenance',
  validate({ query: equipmentLoadReportQuerySchema }),
  reportController.getMaintenanceReport
);

export default router;
