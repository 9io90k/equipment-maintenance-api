import { Router } from 'express';
import healthRouter from './health.route.js';
import equipmentRouter from './equipment.route.js';
import requestRouter from './request.route.js';

const router = Router();

router.use('/', healthRouter);
router.use('/equipment', equipmentRouter);
router.use('/requests', requestRouter);

export default router;
