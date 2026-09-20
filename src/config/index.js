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

  weather: {
    apiUrl: process.env.WEATHER_API_URL || 'https://api.open-meteo.com/v1/forecast',
    timeoutMs: Number(process.env.REQUEST_TIMEOUT_MS) || 5000,
    maxWindSpeed: Number(process.env.WEATHER_MAX_WIND_SPEED) || 12.0,
    maxPrecipitation: Number(process.env.WEATHER_MAX_PRECIPITATION) || 0.5,
  },

  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },
};
