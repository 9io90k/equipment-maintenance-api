import app from './app.js';
import { config } from './config/index.js';
import { logger } from './lib/logger.js';

const server = app.listen(config.port, () => {
  logger.info(
    {
      port: config.port,
      nodeEnv: config.nodeEnv,
      corsOrigins: config.cors.origins,
    },
    `server started successfully on port ${config.port}`
  );
});

function gracefulShutdown(reason, err) {
  if (err) {
    logger.fatal({ err, reason }, `Shutting down due to ${reason}`);
  } else {
    logger.info({ reason }, `Graceful shutdown initiated: ${reason}`);
  }

  server.close(() => {
    logger.info('HTTP server closed, exiting process.');
    process.exit(err ? 1 : 0);
  });

  setTimeout(() => {
    logger.error('Forced shutdown: connections did not close in time');
    process.exit(1);
  }, 10_000).unref();
}

process.on('uncaughtException', (err) => gracefulShutdown('uncaughtException', err));
process.on('unhandledRejection', (reason) => {
  const error = reason instanceof Error ? reason : new Error(String(reason));
  gracefulShutdown('unhandledRejection', error);
});

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
