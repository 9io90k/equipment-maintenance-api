# Equipment Maintenance REST API

REST API на Express 5 для централизованного учёта оборудования производственной площадки и заявок на техническое обслуживание с контролем жизненного цикла и оценкой погодных условий для наружных работ.

---

## 1. Требования к окружению и запуск

- **Node.js**: версии 18.0.0 или выше (требование Express 5).
- **Менеджер пакетов**: npm 9+.

### Установка зависимостей
```bash
npm install
```

### Запуск в режиме разработки (nodemon)
```bash
npm run dev
```

### Запуск в production режиме
```bash
npm start
```

### Запуск автоматических тестов (Jest + Supertest)
```bash
npm test
```

---

## 2. Переменные окружения (.env)

Конфигурация приложения вынесена в переменные окружения. Для локального запуска скопируйте `.env.example` в `.env`:

| Переменная | Значение по умолчанию | Описание |
|---|---|---|
| `PORT` | `3000` | Порт HTTP-сервера |
| `NODE_ENV` | `development` | Режим работы (`development` / `production`) |
| `CORS_ORIGINS` | `http://localhost:3000,http://localhost:5173` | Разрешённые веб-источники через запятую |
| `RATE_LIMIT_WINDOW_MS` | `60000` | Окно ограничения частоты запросов (мс) |
| `RATE_LIMIT_MAX` | `100` | Максимальное количество запросов на `/api` в окно |
| `WEATHER_API_URL` | `https://api.open-meteo.com/v1/forecast` | Внешний API прогноза погоды Open-Meteo |
| `REQUEST_TIMEOUT_MS` | `5000` | Таймаут сетевых запросов (мс) |
| `WEATHER_MAX_WIND_SPEED` | `12.0` | Порог скорости ветра (м/с) для наружных работ |
| `WEATHER_MAX_PRECIPITATION` | `0.5` | Порог осадков (мм) для наружных работ |
| `LOG_LEVEL` | `debug` | Уровень логирования pino (`debug`, `info`, `warn`, `error`) |

---

## 3. Таблица эндпоинтов API

Все маршруты API имеют префикс `/api`.

| Метод | Путь | Назначение | Коды ответов |
|---|---|---|---|
| `GET` | `/api/health` | Проверка доступности сервиса (без внешних вызовов) | `200` |
| `GET` | `/api/equipment` | Список оборудования (фильтрация, пагинация, сортировка) | `200` |
| `POST` | `/api/equipment` | Создание единицы оборудования | `201` (Location), `400`, `409` |
| `GET` | `/api/equipment/:id` | Карточка оборудования | `200`, `400`, `404` |
| `PATCH` | `/api/equipment/:id` | Частичное обновление полей оборудования | `200`, `400`, `404`, `409` |
| `DELETE` | `/api/equipment/:id` | Удаление оборудования (запрещено при активных заявках) | `204`, `400`, `404`, `409` |
| `GET` | `/api/equipment/:id/requests` | Вложенный ресурс: список заявок по оборудованию | `200`, `400`, `404` |
| `GET` | `/api/equipment/:id/weather` | Прогноз погоды по координатам и пригодность работ | `200`, `400`, `404`, `502`, `503`, `504` |
| `GET` | `/api/requests` | Список заявок (фильтрация по статусу, приоритету, id оборудования) | `200` |
| `POST` | `/api/requests` | Создание заявки на обслуживание | `201` (Location), `400`, `404` |
| `GET` | `/api/requests/:id` | Карточка заявки | `200`, `400`, `404` |
| `PATCH` | `/api/requests/:id` | Редактирование полей заявки (кроме статуса) | `200`, `400`, `404` |
| `PATCH` | `/api/requests/:id/status` | Изменение статуса заявки с проверкой допустимости | `200`, `400`, `404`, `409` |
| `DELETE` | `/api/requests/:id` | Удаление заявки | `204`, `400`, `404` |

---

## 4. Модель данных и правила переходов

### Оборудование (`equipment`)
- `id`: UUID (генерируется сервером)
- `name`: строка, 3–100 символов, обязательное
- `type`: `turbine` \| `inverter` \| `sensor` \| `substation`
- `serialNumber`: строка, уникальная в пределах системы
- `location`: `{ lat: number (-90..90), lon: number (-180..180) }`
- `status`: `operational` \| `maintenance` \| `fault` \| `decommissioned` (default: `operational`)
- `installedAt`: ISO-дата, **не в будущем**
- `createdAt`, `updatedAt`: проставляются сервером

### Заявка на обслуживание (`maintenance request`)
- `id`: UUID (генерируется сервером)
- `equipmentId`: UUID, ссылка на существующее оборудование (иначе 404)
- `title`: строка, 5–120 символов, обязательное
- `description`: строка, до 2000 символов
- `priority`: `low` \| `medium` \| `high` \| `critical`
- `status`: `new` \| `in_progress` \| `done` \| `rejected` (default: `new`)
- `plannedAt`: ISO-дата-время, необязательное
- `createdAt`, `updatedAt`: проставляются сервером

- Допустимо: `new` ➔ `in_progress` ➔ `done`; `new` ➔ `rejected`; `in_progress` ➔ `rejected`.
- **Из статусов `done` и `rejected` любые переходы запрещены (409 Conflict)**.
- **Удаление оборудования при наличии незакрытых заявок (`new`, `in_progress`) запрещено (409 Conflict)**.

---

## 5. Формат ответа об ошибке

Все ошибки API имеют единый стандартизированный формат:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Некорректные данные запроса",
    "details": [
      {
        "field": "title",
        "message": "Заголовок должен быть от 5 до 120 символов"
      }
    ],
    "requestId": "b1f2c3d4-5678-90ab-cdef-1234567890ab"
  }
}
```

### Коды ошибок:
- `400 BAD_REQUEST / VALIDATION_ERROR`: синтаксические ошибки JSON или валидация схемы Zod.
- `404 NOT_FOUND`: ресурс или маршрут не найден.
- `409 CONFLICT`: дубликат `serialNumber`, недопустимый переход статуса заявки или удаление оборудования с активными заявками.
- `429 TOO_MANY_REQUESTS`: превышение лимита запросов.
- `500 INTERNAL_ERROR`: непредвиденная ошибка (в production стек-трейсы скрыты).
- `502 / 503 / 504`: ошибки внешнего погодного сервиса (с понятным описанием).

---

## 6. Безопасность и логирование

- **CORS**: список разрешённых доменов загружается из `CORS_ORIGINS`. Запросы с неразрешённых Origin отклоняются.
- **Helmet**: автоматическая установка заголовков безопасности (`Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `HSTS` и др.).
- **Rate Limiting**: `express-rate-limit` защищает эндпоинты `/api` (лимит по умолчанию 100 запросов в минуту на IP).
- **Размер тела**: ограничение парсеров до `100kb`.
- **Логирование**: библиотека `pino` + `pino-http`. Отладочные вызовы `console.log` исключены. Каждый входящий запрос получает `X-Request-Id` (из входящего заголовка или через `crypto.randomUUID()`), который пробрасывается через `AsyncLocalStorage` во все слои. В логах маскируются (`redact`) пароли, токены и куки.

---

## 7. Архитектура проекта

Применена классическая слоистая архитектура:
```
src/
├── app.js               # Сборка Express-приложения и конвейера middleware
├── server.js            # Запуск HTTP сервера и graceful shutdown
├── config/              # Конфигурация и валидация переменных окружения
├── lib/
│   ├── logger.js        # Структурный логгер Pino
│   └── context.js       # Контекст запроса на базе AsyncLocalStorage
├── errors/              # Иерархия ошибок (AppError, NotFoundError, ConflictError, ValidationError)
├── middlewares/
│   ├── http-logger.middleware.js   # Логирование запросов и генерация requestId
│   ├── validate.middleware.js      # Переиспользуемая валидация Zod (body, query, params)
│   └── error-handler.middleware.js # Централизованный обработчик ошибок
├── validators/          # Zod-схемы для equipment и request
├── controllers/         # Контроллеры HTTP-уровня (req, res)
├── services/            # Бизнес-логика и интеграция с погодой (WeatherService)
├── repositories/        # Слой доступа к данным (JSON-файлы в папке data/)
└── routes/              # Маршрутизация REST API
docs/
└── postman/             # Экспортированная коллекция Postman с тестами pm.test
tests/                   # Автотесты на Jest + Supertest
```

---

## 8. Тестирование в Postman

Коллекция экспортирована в файл:
`docs/postman/Equipment-Maintenance-API.postman_collection.json`

Импортируйте коллекцию в Postman. Коллекция использует переменную `{{baseUrl}}` (по умолчанию `http://localhost:3000`) и автоматически сохраняет идентификаторы созданных сущностей в переменные коллекции `{{equipmentId}}` и `{{requestId}}`.
