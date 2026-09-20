import { Router } from 'express';
import healthRouter from './health.route.js';
import equipmentRouter from './equipment.route.js';

const router = Router();

router.use('/', healthRouter);
router.use('/equipment', equipmentRouter);

export default router;
