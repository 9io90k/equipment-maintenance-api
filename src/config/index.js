import dotenv from 'dotenv';

dotenv.config();

const parseCorsOrigins = (raw) => {
  if (!raw) return ['http://localhost:3000'];
  return raw.split(',').map((origin) => origin.trim()).filter(Boolean);
};

export const config = {
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV !== 'production',

  cors: {
    origins: parseCorsOrigins(process.env.CORS_ORIGINS),
  },

  rateLimit: {
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 60_000,
    max: Number(process.env.RATE_LIMIT_MAX) || 100,
  },

  authRateLimit: {
    windowMs: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: process.env.NODE_ENV === 'test' ? 1000 : (Number(process.env.AUTH_RATE_LIMIT_MAX) || 10),
  },

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-in-production',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-in-production',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  weather: {
    apiUrl: process.env.WEATHER_API_URL || 'https://api.open-meteo.com/v1/forecast',
    timeoutMs: Number(process.env.REQUEST_TIMEOUT_MS) || 5000,
    maxWindSpeed: Number(process.env.WEATHER_MAX_WIND_SPEED) || 12.0,
    maxPrecipitation: Number(process.env.WEATHER_MAX_PRECIPITATION) || 0.5,
  },

  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },

  db: {
    host: process.env.PGHOST || process.env.DB_HOST || 'localhost',
    port: Number(process.env.PGPORT || process.env.DB_PORT) || 5432,
    database: process.env.PGDATABASE || process.env.DB_NAME || 'equipment_db',
    user: process.env.PGUSER || process.env.DB_USER || 'app',
    password: process.env.PGPASSWORD || process.env.DB_PASSWORD || '',
    pool: {
      max: Number(process.env.DB_POOL_MAX) || 10,
      min: Number(process.env.DB_POOL_MIN) || 2,
      acquire: Number(process.env.DB_POOL_ACQUIRE) || 5000,
      idle: Number(process.env.DB_POOL_IDLE) || 30000,
    },
  },
};
