import promClient from 'prom-client';

promClient.collectDefaultMetrics({ register: promClient.register });

export const httpRequestsTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests processed',
  labelNames: ['method', 'route', 'status_code'],
});

export const httpRequestDurationSeconds = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
});

export const httpErrorsTotal = new promClient.Counter({
  name: 'http_errors_total',
  help: 'Total number of HTTP error responses',
  labelNames: ['method', 'route', 'status_code', 'error_type'],
});

export const appUpGauge = new promClient.Gauge({
  name: 'app_up',
  help: 'Application operational status (1 for up, 0 for down)',
});
appUpGauge.set(1);

export const maintenanceRequestsTotal = new promClient.Gauge({
  name: 'maintenance_requests_total',
  help: 'Total number of maintenance requests by status and priority',
  labelNames: ['status', 'priority'],
});

export const maintenanceOverdueTotal = new promClient.Gauge({
  name: 'maintenance_overdue_tasks_total',
  help: 'Total number of overdue maintenance requests',
});

export const maintenanceMttrHours = new promClient.Gauge({
  name: 'maintenance_mttr_hours',
  help: 'Mean Time To Resolution (MTTR) in hours for closed requests',
});

export const metricsMiddleware = (req, res, next) => {
  if (req.path === '/metrics' || req.path.startsWith('/api/health')) {
    return next();
  }

  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const duration = Number(process.hrtime.bigint() - start) / 1e9;
    let route;
    if (req.route?.path) {
      route = req.baseUrl ? `${req.baseUrl}${req.route.path}` : req.route.path;
    } else if (res.statusCode === 404) {
      route = 'unmatched';
    } else {
      route = req.baseUrl || req.path || 'unknown';
    }
    const statusCode = String(res.statusCode);

    httpRequestsTotal.inc({ method: req.method, route, status_code: statusCode });
    httpRequestDurationSeconds.observe({ method: req.method, route, status_code: statusCode }, duration);

    if (res.statusCode >= 400) {
      const errorType = res.statusCode >= 500 ? '5xx' : '4xx';
      httpErrorsTotal.inc({ method: req.method, route, status_code: statusCode, error_type: errorType });
    }
  });

  return next();
};

let lastBusinessMetricsUpdate = 0;
const BUSINESS_METRICS_INTERVAL_MS = 15_000;

export const updateBusinessMetrics = async () => {
  const now = Date.now();
  if (now - lastBusinessMetricsUpdate < BUSINESS_METRICS_INTERVAL_MS) {
    return;
  }
  lastBusinessMetricsUpdate = now;

  try {
    const { MaintenanceRequest } = await import('../models/maintenance-request.model.js');
    const { Op, fn, col } = await import('sequelize');

    const counts = await MaintenanceRequest.findAll({
      attributes: ['status', 'priority', [fn('COUNT', col('id')), 'count']],
      group: ['status', 'priority'],
      raw: true,
    });

    maintenanceRequestsTotal.reset();
    for (const item of counts) {
      maintenanceRequestsTotal.set(
        { status: item.status, priority: item.priority },
        Number(item.count) || 0
      );
    }

    const overdueCount = await MaintenanceRequest.count({
      where: {
        plannedAt: { [Op.lt]: new Date() },
        status: { [Op.notIn]: ['done', 'rejected'] },
      },
    });
    maintenanceOverdueTotal.set(overdueCount);

    const completedRequests = await MaintenanceRequest.findAll({
      where: {
        status: 'done',
        closedAt: { [Op.ne]: null },
      },
      attributes: ['createdAt', 'closedAt'],
      raw: true,
      limit: 500,
    });

    if (completedRequests.length > 0) {
      const totalHours = completedRequests.reduce((acc, req) => {
        const diffMs = new Date(req.closedAt).getTime() - new Date(req.createdAt).getTime();
        return acc + Math.max(0, diffMs / (1000 * 60 * 60));
      }, 0);
      maintenanceMttrHours.set(Number((totalHours / completedRequests.length).toFixed(2)));
    } else {
      maintenanceMttrHours.set(0);
    }
  } catch (_err) {
    // Safely ignore DB errors during metrics scraping
  }
};

export const getMetrics = async () => {
  await updateBusinessMetrics();
  return promClient.register.metrics();
};
export const getMetricsContentType = () => promClient.register.contentType;
