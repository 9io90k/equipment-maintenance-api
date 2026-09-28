import { Router } from 'express';
import { reportController } from '../controllers/report.controller.js';
import { validate } from '../middlewares/validate.middleware.js';
import { maintenanceReportQuerySchema } from '../validators/report.validator.js';

const router = Router();

router.get(
  '/maintenance',
  validate({ query: maintenanceReportQuerySchema }),
  reportController.getMaintenanceReport
);

export default router;
