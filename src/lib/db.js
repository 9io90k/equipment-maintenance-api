import { Sequelize } from "sequelize";
import { config } from '../config/index.js';
import { logger } from './logger.js';

export const sequelize = new Sequelize(
    config.db.database,
    config.db.user,
    config.db.password,
    {
        host: config.db.host,
        port: config.db.port,
        dialect: 'postgres',
        pool: {
            max: config.db.pool.max,
            min: config.db.pool.min,
            acquire: config.db.pool.acquire,
            idle: config.db.pool.idle,
        },
        logging: config.isDevelopment
            ? (sql, timing) => logger.debug({ timing }, sql) : false,
    }

);

export async function waitForDatabase({ attempts = 10, baseDelayMs = 500 } = {}) {
    for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
            await sequelize.authenticate();
            logger.info('Соединение с базой данных PostgreSQL успешно установлено');
            return;
        } catch (err) {
            if (attempt == attempts) {
                logger.fatal({ err }, `Не удалось подключиться к базе данных после всех попыток`);
                throw err;
            }
            const delay = baseDelayMs * attempt;
            logger.warn(`База данных недоступна (попытка ${attempt}/${attempts}), повтор через ${delay} мс`);
            await new Promise((resolve) => setTimeout(resolve, delay));
        }
    }
}