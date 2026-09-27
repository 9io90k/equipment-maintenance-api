import { Router } from 'express';
import { sequelize } from '../lib/db.js';
import { logger } from '../lib/logger.js'

const router = Router();

router.get('/health', async (_req, res) => {
  try {
    await sequelize.authenticate();

    return res.status(200).json({
      status: 'ok',
      database: 'up',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    logger.error({ err }, 'Healthcheck failed: database is down');
    return res.status(503).json({
      status: 'error',
      database: 'down',
    });
  }
});

export default router;
