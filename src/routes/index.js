import { Router } from 'express';
import healthRouter from './health.route.js';
import equipmentRouter from './equipment.route.js';
import requestRouter from './request.route.js';
import siteRouter from './site.route.js';
import reportRouter from './report.route.js';

const router = Router();

router.use('/', healthRouter);
router.use('/equipment', equipmentRouter);
router.use('/requests', requestRouter);
router.use('/sites', siteRouter);
router.use('/reports', reportRouter);

export default router;
