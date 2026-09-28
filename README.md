# Equipment Maintenance REST API (CaseLab Week 3)

Промышленный REST API на Express 5 и PostgreSQL (Sequelize ORM) для централизованного учёта оборудования производственных площадок возобновляемой энергетики, заявок на техническое обслуживание, назначения ремонтных бригад и аналитической отчётности с контролем погодных условий.

---

## 1. Требования к окружению и запуск

- **Node.js**: версии 18.0.0 или выше (ES Modules).
- **Docker & Docker Compose**: для контейнеризации СУБД PostgreSQL.
- **Менеджер пакетов**: npm 9+.

### 1.1. Запуск инфраструктуры (Docker PostgreSQL)
Сервис использует контейнеризированную базу данных PostgreSQL:
```bash
docker compose up -d
```
Для остановки контейнеров:
```bash
docker compose down
```

### 1.2. Установка зависимостей
```bash
npm install
```

### 1.3. Миграции и заполнение базы данных (Seeds)
Применение миграций схемы 3NF:
```bash
npm run db:migrate
```
Заполнение демонстрационными данными (сиды площадок, оборудования, паспортов, техников и заявок):
```bash
npm run db:seed
```
Полный сброс и повторный накат базы:
```bash
npm run db:reset
```

### 1.4. Запуск приложения
Режим разработки с автоперезагрузкой:
```bash
npm run dev
```
Production-режим:
```bash
npm start
```

### 1.5. Автоматические тесты (Jest + Supertest)
Запуск набора из 32 интеграционных тестов:
```bash
npm test
```

---

## 2. Переменные окружения (.env)

| Переменная | Значение по умолчанию | Описание |
|---|---|---|
| `PORT` | `3000` | Порт HTTP-сервера |
| `NODE_ENV` | `development` | Режим работы (`development` / `production`) |
| `DATABASE_URL` | `postgres://postgres:postgres@localhost:5432/equipment_maintenance` | Строка подключения к PostgreSQL |
| `DB_POOL_MAX` | `10` | Максимальный размер пула соединений |
| `DB_POOL_MIN` | `2` | Минимальный размер пула соединений |
| `CORS_ORIGINS` | `http://localhost:3000,http://localhost:5173` | Разрешённые веб-источники (не разрешённые отклоняются без 500) |
| `RATE_LIMIT_WINDOW_MS` | `60000` | Окно ограничения частоты запросов (мс) |
| `RATE_LIMIT_MAX` | `100` | Максимальное количество запросов на `/api` в окно |
| `WEATHER_API_URL` | `https://api.open-meteo.com/v1/forecast` | Внешний API прогноза погоды Open-Meteo |
| `WEATHER_MAX_WIND_SPEED` | `12.0` | Порог скорости ветра (м/с) для наружных работ |
| `WEATHER_MAX_PRECIPITATION` | `0.5` | Порог осадков (мм) для наружных работ |
| `LOG_LEVEL` | `debug` | Уровень логирования Pino (`debug`, `info`, `warn`, `error`) |

---

## 3. Схема базы данных (3-я нормальная форма)

Схема нормализована до 3NF и включает 7 сущностей:

```
[ sites ] (Площадки)
   │ 1
   │
   └──< N [ equipment ] (Оборудование)
            │ 1          │ 1
            │            │
            │ 1          └──< N [ maintenance_requests ] (Заявки)
    [ equipment_passports ]          │ 1                  │ 1
     (Технические паспорта)          │                    │
                                     │ N                  └──< N [ request_status_history ]
                           [ request_assignees ]                  (Аудит смены статусов)
                                     │ N
                                     │ 
                                     │ 1
                              [ technicians ] (Техники/бригады)
```

1. **`sites`**: производственные площадки (ВЭС, СЭС) с географическими координатами и регионами.
2. **`equipment`**: единицы оборудования с внешним ключом `site_id` и серийным номером.
3. **`equipment_passports`**: паспорта оборудования (1:1 к `equipment`) с паспортной мощностью (`nominal_power`) и производителем.
4. **`maintenance_requests`**: заявки на техническое обслуживание с приоритетом, статусом и датами выполнения.
5. **`technicians`**: персонал инженерно-ремонтных бригад с разрядом квалификации и специализацией.
6. **`request_assignees`**: таблица-связка M:N между заявками и техниками с фиксацией роли и затраченных часов (`hours`).
7. **`request_status_history`**: неизменяемый журнал (audit trail) изменения статусов заявок.

---

## 4. Таблица эндпоинтов API

Все маршруты API имеют префикс `/api`.

| Метод | Путь | Назначение | Коды ответов |
|---|---|---|---|
| `GET` | `/api/health` | Проверка жизнеспособности сервиса | `200` |
| `GET` | `/api/equipment` | Список оборудования с фильтрами, сортировкой и пагинацией | `200` |
| `POST` | `/api/equipment` | Регистрация нового оборудования | `201` (Location), `400`, `409` |
| `GET` | `/api/equipment/:id` | Карточка оборудования | `200`, `400`, `404` |
| `PATCH` | `/api/equipment/:id` | Редактирование оборудования | `200`, `400`, `404`, `409` |
| `DELETE` | `/api/equipment/:id` | Удаление оборудования (блокируется при открытых заявках) | `204`, `400`, `404`, `409` |
| `GET` | `/api/equipment/:id/requests` | Список заявок по конкретному оборудованию | `200`, `400`, `404` |
| `GET` | `/api/equipment/:id/weather` | Прогноз погоды и допуск к наружным работам | `200`, `400`, `404`, `502-504` |
| `GET` | `/api/requests` | Реестр заявок с фильтрами по статусу, приоритету и диапазону дат | `200` |
| `POST` | `/api/requests` | Создание новой заявки (всегда в статусе `new`) | `201` (Location), `400`, `404` |
| `GET` | `/api/requests/:id` | Карточка заявки | `200`, `400`, `404` |
| `PATCH` | `/api/requests/:id` | Редактирование полей заявки | `200`, `400`, `404` |
| `PATCH` | `/api/requests/:id/status` | Смена статуса заявки с проверкой допустимости переходов | `200`, `400`, `404`, `409` |
| `POST` | `/api/requests/:id/assignees` | Назначение техника на заявку с учётом трудозатрат | `201`, `400`, `404`, `409` |
| `GET` | `/api/requests/:id/history` | Аудиторский след смены статусов заявки | `200`, `400`, `404` |
| `DELETE` | `/api/requests/:id` | Удаление заявки | `204`, `400`, `404` |
| `GET` | `/api/sites` | Список всех производственных площадок | `200` |
| `GET` | `/api/sites/:id/summary` | Сводка по площадке: суммарная мощность, разбивка по статусам и активным заявкам | `200`, `400`, `404` |
| `GET` | `/api/reports/maintenance` | **Аналитический Raw SQL отчёт** по трудозатратам бригад и MTTR | `200`, `400` |

---

## 5. Примеры запросов и ответов

### 5.1. Регистрация оборудования (`POST /api/equipment`)

**Запрос:**
```http
POST /api/equipment HTTP/1.1
Host: localhost:3000
Content-Type: application/json

{
  "name": "Ветрогенератор ВЭУ-05",
  "type": "wind_turbine",
  "serialNumber": "WT-2024-005",
  "location": {
    "lat": 68.9712,
    "lon": 33.0845
  },
  "status": "operational",
  "installedAt": "2024-03-01T00:00:00.000Z"
}
```

**Ответ:** `201 Created`
```http
Location: /api/equipment/7a8f3b21-4f12-4c8d-9b10-6e4a2c1f90a1
Content-Type: application/json; charset=utf-8

{
  "data": {
    "id": "7a8f3b21-4f12-4c8d-9b10-6e4a2c1f90a1",
    "name": "Ветрогенератор ВЭУ-05",
    "type": "wind_turbine",
    "serialNumber": "WT-2024-005",
    "location": {
      "lat": 68.9712,
      "lon": 33.0845
    },
    "status": "operational",
    "installedAt": "2024-03-01T00:00:00.000Z",
    "createdAt": "2026-09-28T12:00:00.000Z",
    "updatedAt": "2026-09-28T12:00:00.000Z"
  }
}
```

---

### 5.2. Создание заявки на обслуживание (`POST /api/requests`)

> **Правило бизнес-логики**: Любая создаваемая заявка принудительно переводится в статус `new`. Создание заявки сразу в статусе `done` запрещено.

**Запрос:**
```http
POST /api/requests HTTP/1.1
Host: localhost:3000
Content-Type: application/json

{
  "equipmentId": "22222222-2222-4222-8222-222222222001",
  "title": "Плановое ТО редуктора и замена масла",
  "description": "Провести диагностику уровня вибраций и замену смазки",
  "priority": "high",
  "plannedAt": "2026-10-15T09:00:00.000Z"
}
```

**Ответ:** `201 Created`
```http
Location: /api/requests/a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d
Content-Type: application/json; charset=utf-8

{
  "data": {
    "id": "a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d",
    "equipmentId": "22222222-2222-4222-8222-222222222001",
    "title": "Плановое ТО редуктора и замена масла",
    "description": "Провести диагностику уровня вибраций и замену смазки",
    "priority": "high",
    "status": "new",
    "author": "Dispatcher",
    "plannedAt": "2026-10-15T09:00:00.000Z",
    "createdAt": "2026-09-28T12:05:00.000Z",
    "updatedAt": "2026-09-28T12:05:00.000Z"
  }
}
```

---

### 5.3. Назначение техника на заявку (`POST /api/requests/:id/assignees`)

**Запрос:**
```http
POST /api/requests/a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d/assignees HTTP/1.1
Host: localhost:3000
Content-Type: application/json

{
  "technicianId": "33333333-3333-4333-8333-333333333001",
  "role": "lead",
  "hours": 4.5
}
```

**Ответ:** `201 Created`
```json
{
  "data": {
    "id": "f9a8b7c6-d5e4-4f3a-8b2c-1d0e9f8a7b6c",
    "requestId": "a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d",
    "technicianId": "33333333-3333-4333-8333-333333333001",
    "role": "lead",
    "hours": 4.5,
    "assignedAt": "2026-09-28T12:10:00.000Z"
  }
}
```

---

### 5.4. История статусов заявки (Audit Trail) (`GET /api/requests/:id/history`)

**Запрос:**
```http
GET /api/requests/a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d/history HTTP/1.1
Host: localhost:3000
```

**Ответ:** `200 OK`
```json
{
  "data": [
    {
      "id": "11111111-aaaa-4111-8111-000000000001",
      "requestId": "a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d",
      "previousStatus": null,
      "newStatus": "new",
      "changedBy": "Dispatcher",
      "comment": "Заявка создана",
      "createdAt": "2026-09-28T12:05:00.000Z"
    },
    {
      "id": "22222222-bbbb-4222-8222-000000000002",
      "requestId": "a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d",
      "previousStatus": "new",
      "newStatus": "in_progress",
      "changedBy": "System",
      "comment": null,
      "createdAt": "2026-09-28T12:15:00.000Z"
    }
  ]
}
```

---

### 5.5. Сводка по площадке (`GET /api/sites/:id/summary`)

**Запрос:**
```http
GET /api/sites/11111111-1111-4111-8111-111111111001/summary HTTP/1.1
Host: localhost:3000
```

**Ответ:** `200 OK`
```json
{
  "data": {
    "site": {
      "id": "11111111-1111-4111-8111-111111111001",
      "name": "Ветропарк Северный",
      "code": "SITE-WIND-01",
      "region": "Мурманская область",
      "coordinates": {
        "lat": 68.97,
        "lng": 33.08
      },
      "createdAt": "2026-05-31T10:00:00.000Z",
      "updatedAt": "2026-05-31T10:00:00.000Z"
    },
    "metrics": {
      "totalEquipment": 3,
      "totalNominalPower": 22900,
      "equipmentByStatus": {
        "operational": 2,
        "under_maintenance": 1,
        "decommissioned": 0
      },
      "equipmentByType": {
        "wind_turbine": 2,
        "substation": 1
      },
      "activeRequestsCount": 6
    }
  }
}
```

---

### 5.6. Аналитический Raw SQL отчёт по ТО и MTTR (`GET /api/reports/maintenance`)

**Запрос:**
```http
GET /api/reports/maintenance?siteId=11111111-1111-4111-8111-111111111001 HTTP/1.1
Host: localhost:3000
```

**Ответ:** `200 OK`
```json
{
  "data": {
    "period": {
      "startDate": null,
      "endDate": null
    },
    "filters": {
      "siteId": "11111111-1111-4111-8111-111111111001"
    },
    "overall": {
      "totalEquipment": 3,
      "totalRequests": 10,
      "completedRequests": 4,
      "activeRequests": 6,
      "rejectedRequests": 0,
      "totalTechnicianHours": 24.5
    },
    "breakdown": [
      {
        "siteId": "11111111-1111-4111-8111-111111111001",
        "siteName": "Ветропарк Северный",
        "siteCode": "SITE-WIND-01",
        "equipmentType": "substation",
        "equipmentCount": 1,
        "totalRequests": 2,
        "completedRequests": 1,
        "activeRequests": 1,
        "rejectedRequests": 0,
        "totalTechnicianHours": 5.0,
        "avgResolutionTimeHours": 3.8
      },
      {
        "siteId": "11111111-1111-4111-8111-111111111001",
        "siteName": "Ветропарк Северный",
        "siteCode": "SITE-WIND-01",
        "equipmentType": "wind_turbine",
        "equipmentCount": 2,
        "totalRequests": 8,
        "completedRequests": 3,
        "activeRequests": 5,
        "rejectedRequests": 0,
        "totalTechnicianHours": 19.5,
        "avgResolutionTimeHours": 5.2
      }
    ]
  }
}
```

---

### 5.7. Примеры ошибок

#### 400 Validation Error (Отрицательные часы или невалидная схема)
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Некорректные данные запроса",
    "details": [
      {
        "field": "hours",
        "message": "Количество часов не может быть отрицательным"
      }
    ],
    "requestId": "9a1b2c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d"
  }
}
```

#### 409 Conflict (Недопустимый переход статуса)
```json
{
  "error": {
    "code": "CONFLICT",
    "message": "Недопустимый переход статуса из 'done' в 'in_progress'",
    "requestId": "8f7e6d5c-4b3a-2109-8765-43210fedcba9"
  }
}
```

---

## 6. Безопасность и архитектурные решения

1. **CORS без аварийных сбоев**:
   - При запросе с неразрешённого веб-источника CORS-middleware вызывает `callback(null, false)`. Заголовки CORS опускаются, браузер блокирует ответ, а Express не падает с ошибкой 500.
2. **Безопасность Raw SQL отчётов**:
   - Аналитический SQL-запрос использует параметризованные bind-переменные (`:startDate`, `:endDate`, `:siteId`), исключая риск SQL-инъекций.
3. **Целостность транзакций**:
   - Смена статусов и аудит-трейлы выполняются в атомарных ACID-транзакциях PostgreSQL (`sequelize.transaction`).
4. **Rate Limiting**:
   - Защита эндпоинтов `/api` с лимитом 100 запросов/минуту и передачей заголовков `RateLimit-*`.
5. **Логирование Pino**:
   - Корреляция логов через `X-Request-Id` и `AsyncLocalStorage`.

---

## 7. Коллекция Postman

Файлы для тестирования находятся в директории `docs/postman/`:
1. `docs/postman/Equipment-Maintenance-API.postman_collection.json`
2. `docs/postman/Equipment-Maintenance-API.postman_environment.json`

### Особенности запуска:
- **Порядок выполнения**: Запрос `DELETE /api/equipment/{{equipmentId}}` вынесен в отдельную завершающую папку **Cleanup**, поэтому создание и прогон заявок происходят гарантированно до удаления родительского оборудования.
- **Изоляция переменных**: Переменные окружения не затирают динамические переменные коллекции.
- **Проверка Rate Limiting**: В тесте на заголовки лимитирования проверяются как нормальный ответ 200, так и код 429 при исчерпании квоты.
