import { Router } from 'express';
import healthRouter from './health.route.js';
import equipmentRouter from './equipment.route.js';
import requestRouter from './request.route.js';
import siteRouter from './site.route.js';
import reportRouter from './report.route.js';
import authRouter from './auth.route.js';
import docsRouter from './docs.route.js';

const router = Router();

router.use('/docs', docsRouter);
router.use('/auth', authRouter);
router.use('/', healthRouter);
router.use('/equipment', equipmentRouter);
router.use('/requests', requestRouter);
router.use('/sites', siteRouter);
router.use('/reports', reportRouter);

export default router;
