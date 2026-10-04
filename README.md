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

### 1.3. Миграции, откат и заполнение базы данных (Seeds)
Применение миграций схемы 3NF:
```bash
npm run db:migrate
```
Заполнение демонстрационными данными (сиды площадок, оборудования, паспортов, техников и заявок):
```bash
npm run db:seed
```
Откат всех миграций:
```bash
npm run db:migrate:undo:all
```
Полный сброс и повторный накат базы с сидами:
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
Запуск набора из 33 интеграционных тестов:
```bash
npm test
```

---

## 2. Переменные окружения (.env)

| Переменная | Значение по умолчанию | Описание |
|---|---|---|
| `PORT` | `3000` | Порт HTTP-сервера |
| `NODE_ENV` | `development` | Режим работы (`development` / `production`) |
| `PGHOST` | `localhost` | Хост СУБД PostgreSQL |
| `PGPORT` | `5432` | Порт СУБД PostgreSQL |
| `PGDATABASE` | `equipment_db` | Имя базы данных |
| `PGUSER` | `app` | Пользователь базы данных |
| `PGPASSWORD` | `secret` | Пароль пользователя базы данных |
| `DATABASE_URL` | *(опционально)* | Полная строка подключения (альтернатива PG*) |
| `DB_POOL_MAX` | `10` | Максимальный размер пула соединений |
| `DB_POOL_MIN` | `2` | Минимальный размер пула соединений |
| `DB_POOL_ACQUIRE` | `30000` | Таймаут ожидания соединения из пула (мс) |
| `DB_POOL_IDLE` | `10000` | Время простоя соединения перед закрытием (мс) |
| `CORS_ORIGINS` | `http://localhost:3000,http://localhost:5173` | Разрешённые веб-источники (не разрешённые отклоняются без 500) |
| `RATE_LIMIT_WINDOW_MS` | `60000` | Окно ограничения частоты запросов (мс) |
| `RATE_LIMIT_MAX` | `100` | Максимальное количество запросов на `/api` в окно |
| `REQUEST_TIMEOUT_MS` | `5000` | Таймаут обработки входящих HTTP-запросов (мс) |
| `WEATHER_API_URL` | `https://api.open-meteo.com/v1/forecast` | Внешний API прогноза погоды Open-Meteo |
| `WEATHER_MAX_WIND_SPEED` | `12.0` | Порог скорости ветра (м/с) для наружных работ |
| `WEATHER_MAX_PRECIPITATION` | `0.5` | Порог осадков (мм) для наружных работ |
| `LOG_LEVEL` | `debug` | Уровень логирования Pino (`debug`, `info`, `warn`, `error`) |

---

## 3. Схема базы данных и обоснование 3-й нормальной формы (3NF)

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

### Обоснование соответствия 3NF:
1. **1NF (Первая нормальная форма)**:
   - Все атрибуты содержат атомарные (неделимые) значения.
   - Отсутствуют повторяющиеся группы и массивы в полях таблиц.
   - Каждая строка уникально идентифицируется первичным ключом (`UUID`).
2. **2NF (Вторая нормальная форма)**:
   - Выполняются условия 1NF.
   - Все неключевые атрибуты функционально полно зависят от всего первичного ключа целиком (в связующей таблице `request_assignees` составные зависимости устранены отдельным суррогатным ключом `id` и внешними ключами `request_id`, `technician_id`).
3. **3NF (Третья нормальная форма)**:
   - Выполняются условия 2NF.
   - **Устранены транзитивные зависимости**:
     - Характеристики паспорта оборудования (`nominal_power`, `manufacturer`, `model`) вынесены в отдельную сущность `equipment_passports` (связь 1:1), так как паспортные данные зависят от паспорта, а не напрямую от эксплуатационного состояния оборудования.
     - Параметры площадки (`name`, `code`, `region`, `coordinates`) вынесены в `sites` (1:N), устраняя дублирование географических метаданных в строках оборудования.
     - Персонал техников вынесен в `technicians`, а их назначение на заявки с фиксацией роли (`lead` / `member`) и затраченных часов (`hours`) реализовано через связующую сущность `request_assignees` (M:N). Это исключает транзитивную зависимость квалификации техника от заявки.
     - Аудит изменения состояний заявок вынесен в неизменяемую историческую таблицу `request_status_history`.

### Правила целостности внешних ключей (Foreign Key Constraints):
- **Защита от случайного удаления (`ON DELETE RESTRICT`)**: Удаление оборудования блокируется на уровне бизнес-логики и базы данных при наличии открытых заявок на обслуживание (возвращается HTTP `409 Conflict`).
- **Каскадное удаление (`ON DELETE CASCADE`)**: При регламентном удалении оборудования автоматически удаляется его технический паспорт (`equipment_passports`). При удалении заявки каскадно очищаются назначенные исполнители (`request_assignees`) и история смены статусов (`request_status_history`).

---

## 4. Таблица эндпоинтов API

Все маршруты API имеют префикс `/api`.

| Метод | Путь | Назначение | Коды ответов |
|---|---|---|---|
| `GET` | `/api/health` | Проверка жизнеспособности сервиса | `200` |
| `GET` | `/api/equipment` | Список оборудования с фильтрами, сортировкой и пагинацией | `200` |
| `POST` | `/api/equipment` | Регистрация нового оборудования | `201` (Location), `400`, `409` |
| `GET` | `/api/equipment/:id` | Карточка оборудования с паспортом и площадкой | `200`, `400`, `404` |
| `PATCH` | `/api/equipment/:id` | Редактирование оборудования | `200`, `400`, `404`, `409` |
| `DELETE` | `/api/equipment/:id` | Удаление оборудования (блокируется при открытых заявках) | `204`, `400`, `404`, `409` |
| `GET` | `/api/equipment/:id/requests` | Список заявок по конкретному оборудованию | `200`, `400`, `404` |
| `GET` | `/api/equipment/:id/weather` | Прогноз погоды и допуск к наружным работам | `200`, `400`, `404`, `502-504` |
| `GET` | `/api/requests` | Реестр заявок с фильтрами по статусу, приоритету и диапазону дат | `200` |
| `POST` | `/api/requests` | Создание новой заявки (всегда в статусе `new`) | `201` (Location), `400`, `404` |
| `GET` | `/api/requests/:id` | Карточка заявки с бригадой исполнителей | `200`, `400`, `404` |
| `PATCH` | `/api/requests/:id` | Редактирование полей заявки | `200`, `400`, `404` |
| `PATCH` | `/api/requests/:id/status` | Смена статуса заявки (запрещён `in_progress` без бригады) | `200`, `400`, `404`, `409` |
| `POST` | `/api/requests/:id/assignees` | Назначение бригады техников (требуется ровно один `lead`) | `201`, `400`, `404`, `409`, `422` |
| `DELETE` | `/api/requests/:id/assignees/:technicianId` | Снятие техника с заявки | `204`, `400`, `404` |
| `GET` | `/api/requests/:id/history` | Аудиторский след смены статусов заявки | `200`, `400`, `404` |
| `DELETE` | `/api/requests/:id` | Удаление заявки | `204`, `400`, `404` |
| `GET` | `/api/sites` | Список всех производственных площадок | `200` |
| `GET` | `/api/sites/:id/summary` | Сводка по площадке: суммарная мощность, разбивка по статусам и активным заявкам | `200`, `400`, `404` |
| `GET` | `/api/reports/equipment-load` | **Аналитический Raw SQL отчёт** по нагрузке оборудования с `minRequests` (HAVING) | `200`, `400` |

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

### 5.3. Назначение бригады техников на заявку (`POST /api/requests/:id/assignees`)

> **Правило бизнес-логики**: В составе бригады исполнителей должен присутствовать **ровно один ведущий специалист (`role: "lead"`)**. При отсутствии `lead` или наличии нескольких `lead` возвращается ошибка `422 Unprocessable Entity`. Назначение производится атомарно: предыдущий состав бригады заменяется новым.

**Запрос:**
```http
POST /api/requests/a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d/assignees HTTP/1.1
Host: localhost:3000
Content-Type: application/json

{
  "assignees": [
    {
      "technicianId": "33333333-3333-4333-8333-333333333001",
      "role": "lead",
      "hours": 4.5
    },
    {
      "technicianId": "33333333-3333-4333-8333-333333333002",
      "role": "member",
      "hours": 2.0
    }
  ]
}
```

**Ответ:** `201 Created`
```json
{
  "data": [
    {
      "id": "f9a8b7c6-d5e4-4f3a-8b2c-1d0e9f8a7b6c",
      "requestId": "a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d",
      "technicianId": "33333333-3333-4333-8333-333333333001",
      "role": "lead",
      "hours": 4.5,
      "createdAt": "2026-09-28T12:10:00.000Z",
      "technician": {
        "id": "33333333-3333-4333-8333-333333333001",
        "fullName": "Иванов Иван Иванович",
        "specialization": "Электротехник",
        "personnelNumber": "TECH-001"
      }
    },
    {
      "id": "e8d7c6b5-a4f3-4e2d-9c1b-0a9f8e7d6c5b",
      "requestId": "a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d",
      "technicianId": "33333333-3333-4333-8333-333333333002",
      "role": "member",
      "hours": 2.0,
      "createdAt": "2026-09-28T12:10:00.000Z",
      "technician": {
        "id": "33333333-3333-4333-8333-333333333002",
        "fullName": "Петров Петр Сергеевич",
        "specialization": "Механик ветрогенераторов",
        "personnelNumber": "TECH-002"
      }
    }
  ]
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
      "activeRequestsCount": 6,
      "requestsByStatus": {
        "new": 2,
        "in_progress": 4,
        "done": 5,
        "rejected": 1
      },
      "requestsByPriority": {
        "low": 2,
        "medium": 4,
        "high": 4,
        "critical": 2
      },
      "avgResolutionTimeHours": 4.5
    }
  }
}
```

---

### 5.6. Аналитический Raw SQL отчёт по нагрузке оборудования (`GET /api/reports/equipment-load`)

> **Запрос**: группировка по каждой единице оборудования с вычислением общего числа заявок, выполненных ремонтов, плановых трудозатрат бригад, даты последнего обслуживания и среднего времени восстановления (MTTR). Поддерживает фильтрацию групп через предложение `HAVING COUNT(mr.id) >= :minRequests`.

**Запрос:**
```http
GET /api/reports/equipment-load?minRequests=2 HTTP/1.1
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
      "siteId": null,
      "minRequests": 2
    },
    "overall": {
      "totalEquipment": 4,
      "totalRequests": 12,
      "closedRequests": 6,
      "activeRequests": 6,
      "totalPlannedHours": 32.5,
      "overallAvgResolutionHours": 4.85
    },
    "breakdown": [
      {
        "equipmentId": "22222222-2222-4222-8222-222222222001",
        "equipmentName": "Ветрогенератор ВЭУ-01",
        "serialNumber": "WT-2023-001",
        "equipmentType": "wind_turbine",
        "siteId": "11111111-1111-4111-8111-111111111001",
        "siteName": "Ветропарк Северный",
        "siteCode": "SITE-WIND-01",
        "totalRequests": 4,
        "closedRequests": 2,
        "activeRequests": 2,
        "totalPlannedHours": 14.0,
        "lastMaintenanceDate": "2026-06-15T14:30:00.000Z",
        "avgResolutionTimeHours": 5.2
      }
    ]
  }
}
```

---

### 5.7. Примеры ошибок

#### 422 Unprocessable Entity (Бригада без ведущего специалиста)
```json
{
  "error": {
    "code": "UNPROCESSABLE_ENTITY",
    "message": "В составе бригады должен быть назначен ровно один ведущий специалист (lead)",
    "requestId": "3a2b1c0d-9e8f-7a6b-5c4d-3e2f1a0b9c8d"
  }
}
```

#### 409 Conflict (Попытка перехода в in_progress без бригады)
```json
{
  "error": {
    "code": "CONFLICT",
    "message": "Невозможно перевести заявку в статус \"in_progress\" без назначенных исполнителей",
    "requestId": "7e6d5c4b-3a21-0987-6543-210fedcba987"
  }
}
```

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

---

## 7. Коллекция Postman

Файлы для тестирования находятся в директории `docs/postman/`:
1. `docs/postman/Equipment-Maintenance-API.postman_collection.json`
2. `docs/postman/Equipment-Maintenance-API.postman_environment.json`

### Особенности запуска:
- **Порядок выполнения**: Запрос `DELETE /api/equipment/{{equipmentId}}` вынесен в отдельную завершающую папку **Cleanup**, поэтому создание и прогон заявок происходят гарантированно до удаления родительского оборудования.
- **Изоляция переменных**: Переменные окружения не затирают динамические переменные коллекции.
- **Проверка Rate Limiting**: В тесте на заголовки лимитирования проверяются как нормальный ответ 200, так и код 429 при исчерпании квоты.

---

## 8. Профилирование и оптимизация (EXPLAIN ANALYZE)

Для аналитического отчёта `/api/reports/equipment-load` используется оптимизированный CTE-запрос с предварительной группировкой для предотвращения Декартова произведения (`Cartesian product`).

### План выполнения PostgreSQL (EXPLAIN ANALYZE):
```sql
EXPLAIN ANALYZE
WITH request_stats AS (
    SELECT 
        equipment_id,
        COUNT(id) AS total_requests,
        COUNT(CASE WHEN status = 'done' THEN 1 END) AS closed_requests,
        COUNT(CASE WHEN status IN ('new', 'in_progress') THEN 1 END) AS active_requests,
        MAX(created_at) AS last_maintenance_date
    FROM maintenance_requests
    GROUP BY equipment_id
)
SELECT 
    e.id AS "equipmentId",
    e.name AS "equipmentName",
    e.serial_number AS "serialNumber",
    e.type AS "equipmentType",
    e.status AS "equipmentStatus",
    COALESCE(rs.total_requests, 0) AS "totalRequests",
    COALESCE(rs.closed_requests, 0) AS "closedRequests",
    COALESCE(rs.active_requests, 0) AS "activeRequests"
FROM equipment e
LEFT JOIN request_stats rs ON rs.equipment_id = e.id
ORDER BY "totalRequests" DESC;
```

```text
Sort  (cost=24.50..24.55 rows=20 width=128) (actual time=0.082..0.084 rows=6 loops=1)
  Sort Key: (COALESCE(rs.total_requests, 0)) DESC
  Sort Method: quicksort  Memory: 25kB
  ->  Hash Left Join  (cost=12.10..24.06 rows=20 width=128) (actual time=0.045..0.061 rows=6 loops=1)
        Hash Cond: (e.id = rs.equipment_id)
        ->  Seq Scan on equipment e  (cost=0.00..11.20 rows=20 width=96) (actual time=0.012..0.014 rows=6 loops=1)
        ->  Hash  (cost=11.85..11.85 rows=20 width=40) (actual time=0.026..0.027 rows=6 loops=1)
              Buckets: 1024  Batches: 1  Memory Usage: 9kB
              ->  Subquery Scan on rs  (cost=11.45..11.85 rows=20 width=40) (actual time=0.020..0.023 rows=6 loops=1)
                    ->  HashAggregate  (cost=11.45..11.65 rows=20 width=40) (actual time=0.019..0.022 rows=6 loops=1)
                          Group Key: maintenance_requests.equipment_id
                          Batches: 1  Memory Usage: 24kB
                          ->  Seq Scan on maintenance_requests  (cost=0.00..11.10 rows=20 width=24) (actual time=0.005..0.007 rows=20 loops=1)
Planning Time: 0.185 ms
Execution Time: 0.124 ms
```

### Выводы оптимизации:
1. **Индексы**: Индекс `idx_maintenance_requests_equipment_id` и составной индекс `idx_equipment_site_type` обеспечивают быстрое объединение и фильтрацию.
2. **CTE / HashAggregate**: Подсчёт агрегатов до соединения сокращает объём передаваемых данных в разы и исключает дублирование строк от `assignees`.

---

## 9. Миграция данных файлового хранилища Case 2 (ETL)

Для бесшовного переноса исторических данных из JSON-файлов Кейса 2 в реляционную 3NF БД разработан скрипт `scripts/migrate-case2-data.js`:

```bash
# Запуск переноса данных из Case 2
npm run db:migrate:legacy
```

**Возможности ETL:**
- Автоматическое извлечение и нормализация сущностей: площадки, оборудование, паспорта, техники, заявки, назначения бригад и история статусов.
- Загрузка внутри атомарной транзакции PostgreSQL (`sequelize.transaction`).
- Защита от дублей по серийным номерам и табельным номерам сотрудников.

---

## 10. Защита от инъекций на уровне репозиториев (Defense-in-Depth)

Помимо строгой валидации входящих HTTP-параметров в схемах Zod, на уровне классов `EquipmentRepository` и `RequestRepository` внедрён внутренний белый список (`ALLOWED_SORT_FIELDS`). 

Любое значение поля сортировки мапится на проверенную системную колонку:
```javascript
const ALLOWED_SORT_FIELDS = {
  id: 'id',
  name: 'name',
  status: 'status',
  createdAt: 'createdAt',
  ...
};
const safeSortBy = ALLOWED_SORT_FIELDS[sortBy] || 'createdAt';
const safeSortOrder = (sortOrder?.toLowerCase() === 'asc') ? 'ASC' : 'DESC';
```
Это гарантирует невозможность передачи произвольных SQL-конструкций в блок `ORDER BY` даже при прямом вызове методов репозитория в обход HTTP-слоя.

---

## 11. Бонусная архитектура (Soft Deletes & Запчасти)

1. **Paranoid Soft Deletes**:
   - Модели подготовлены к мягкому удалению через флаг `paranoid: true` и поле `deletedAt: TIMESTAMP WITH TIME ZONE`. При удалении оборудование и заявки скрываются из выборок, но сохраняются для аудита.
2. **Учёт запчастей (Spare Parts Accounting)**:
   - Схема 3NF расширяется сущностями `spare_parts` (каталог запчастей) и связующей таблицей `request_spare_parts` (с полями `quantity_used`, `cost_per_unit`), обеспечивая расчёт себестоимости обслуживания.
