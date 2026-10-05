import { Router } from 'express';
import { sequelize } from '../lib/db.js';
import { logger } from '../lib/logger.js';
import { getMetrics, getMetricsContentType } from '../lib/metrics.js';

const router = Router();

router.get('/health/live', (_req, res) => {
  return res.status(200).json({
    status: 'up',
    uptime: process.uptime(),
    timestamp: Date.now(),
  });
});

router.get('/health/ready', async (_req, res) => {
  try {
    await sequelize.authenticate();

    return res.status(200).json({
      status: 'up',
      uptime: process.uptime(),
      timestamp: Date.now(),
      services: {
        database: 'up',
      },
    });
  } catch (err) {
    logger.error({ err }, 'Readiness check failed: database unavailable');
    return res.status(503).json({
      status: 'down',
      uptime: process.uptime(),
      timestamp: Date.now(),
      services: {
        database: 'down',
      },
      error: 'Database connection failed',
    });
  }
});

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

router.get('/metrics', async (_req, res) => {
  res.set('Content-Type', getMetricsContentType());
  return res.end(await getMetrics());
});

export default router;
