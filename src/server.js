import app from './app.js';
import { config } from './config/index.js';
import { logger } from './lib/logger.js';
import { sequelize, waitForDatabase } from './lib/db.js';

let server;
let isShuttingDown = false;

async function startServer() {
  try {
    await waitForDatabase();

    server = app.listen(config.port, () => {
      logger.info(
        {
          port: config.port,
          nodeEnv: config.nodeEnv,
          corsOrigins: config.cors.origins,
        },
        `server started successfully on port ${config.port}`
      );
    });
  } catch (err) {
    logger.fatal({ err }, 'Failed to start server due to database connection error');
    process.exit(1);
  }
}



async function gracefulShutdown(reason, err) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  setTimeout(() => {
    logger.error('Forced shutdown: connections did not close in time');
    process.exit(1);
  }, 10_000).unref();

  if (err) {
    logger.fatal({ err, reason }, `Shutting down due to ${reason}`);
  } else {
    logger.info({ reason }, `Graceful shutdown initiated: ${reason}`);
  }

  if (server) {
    await new Promise((resolve) => server.close(resolve));
    logger.info('HTTP server closed, сlosing database pool...');
  }

  try {
    await sequelize.close();
    logger.info('Database pool closed, exiting process');
    process.exit(err ? 1 : 0);
  } catch (closeErr) {
    logger.error({ closeErr }, 'Error during database pool close');
    process.exit(1);
  }
}

process.on('uncaughtException', (err) => gracefulShutdown('uncaughtException', err));
process.on('unhandledRejection', (reason) => {
  const error = reason instanceof Error ? reason : new Error(String(reason));
  gracefulShutdown('unhandledRejection', error);
});

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

startServer();