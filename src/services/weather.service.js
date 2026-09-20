import { config } from '../config/index.js';
import { AppError } from '../errors/index.js';
import { getLog } from '../lib/context.js';

export class WeatherService {
  async fetchWithTimeout(url, timeoutMs = config.weather.timeoutMs) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        throw new AppError(`Внешний погодный сервис вернул ошибку (HTTP ${response.status})`, {
          status: 502,
          code: 'WEATHER_SERVICE_ERROR',
        });
      }

      return await response.json();
    } catch (err) {
      if (err instanceof AppError) throw err;

      if (err.name === 'AbortError') {
        throw new AppError(`Таймаут ожидания ответа погодного сервиса (${timeoutMs}мс)`, {
          status: 504,
          code: 'WEATHER_SERVICE_TIMEOUT',
        });
      }

      getLog().error({ err }, 'Ошибка связи с внешним погодным API');
      throw new AppError('Погодный сервис временно недоступен', {
        status: 503,
        code: 'WEATHER_SERVICE_UNAVAILABLE',
        cause: err,
      });
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async getForecastAndSuitability(lat, lon, days = 3) {
    const url = new URL(config.weather.apiUrl);
    const params = new URLSearchParams({
      latitude: String(lat),
      longitude: String(lon),
      daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max',
      forecast_days: String(days),
      timezone: 'auto',
    });
    url.search = params.toString();

    const data = await this.fetchWithTimeout(url);

    if (!data.daily || !data.daily.time) {
      throw new AppError('Погодный сервис вернул неполные данные о прогнозе', {
        status: 502,
        code: 'WEATHER_DATA_INVALID',
      });
    }

    const { maxWindSpeed, maxPrecipitation } = config.weather;

    const forecast = data.daily.time.map((date, index) => {
      const tempMax = data.daily.temperature_2m_max?.[index] ?? null;
      const tempMin = data.daily.temperature_2m_min?.[index] ?? null;
      const precipitation = data.daily.precipitation_sum?.[index] ?? 0;
      const windSpeed = data.daily.wind_speed_10m_max?.[index] ?? 0;
      const isWindSafe = windSpeed <= maxWindSpeed;
      const isPrecipitationSafe = precipitation <= maxPrecipitation;
      const isSuitable = isWindSafe && isPrecipitationSafe;

      return {
        date,
        tempMax,
        tempMin,
        precipitation,
        windSpeed,
        isSuitableForOutdoorWork: isSuitable,
        safetyFactors: {
          windSafe: isWindSafe,
          precipitationSafe: isPrecipitationSafe,
        },
      };
    });

    return {
      location: { lat, lon },
      forecastDays: days,
      safetyThresholds: {
        maxWindSpeed,
        maxPrecipitation,
      },
      forecast,
    };
  }
}

export const weatherService = new WeatherService();
