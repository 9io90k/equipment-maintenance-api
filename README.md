# Equipment Maintenance REST API — Industrial Production Stack

Промышленный отказоустойчивый REST API на **Node.js (Express 5)**, **PostgreSQL 18 (Sequelize ORM)**, **Nginx**, **Prometheus** и **Grafana** для централизованного учёта оборудования возобновляемой энергетики, заявок на техническое обслуживание, назначения ремонтных бригад, прогноза погоды и сквозного мониторинга.

---

## 1. Архитектура системы

Комплекс спроектирован по принципу нулевого доверия и строгой изоляции сетевых контуров. Единственной точкой входа из внешней сети является реверс-прокси Nginx (порт 80). Порты приложения (3000) и СУБД (5432) изолированы во внутренней виртуальной сети Docker (`backend-net`).

```mermaid
flowchart TD
    Client([Клиент / Браузер / Postman]) -->|HTTP :80| Nginx[Nginx Reverse Proxy]
    
    subgraph Docker Internal Network [backend-net]
        Nginx -->|/api/*| API[Node.js 22 Express 5 API :3000]
        Nginx -->|RFC 9457 Errors 502/503/504| ErrPages[/_errors/]
        API -->|Sequelize Pool| DB[(PostgreSQL 18\n3NF Schema)]
        Prometheus[Prometheus :9090] -->|Scrape :3000/metrics\nкаждые 10s| API
        Grafana[Grafana :3001] -->|PromQL| Prometheus
    end

    UserDash([Инженер / SRE]) -->|HTTP :3001| Grafana
```

---

## 2. Быстрый старт (Zero-Config Deployment)

Все сервисы стека запускаются **одной командой без необходимости ручной настройки**:

```bash
docker compose up -d
```

### Что происходит автоматически при запуске:
1. Поднимается контейнер **PostgreSQL 18** с healthcheck `pg_isready`.
2. Контейнер **Node.js API** ожидает фактической готовности базы данных через `netcat`-цикл в `docker-entrypoint.sh`.
3. Автоматически накатываются миграции схемы 3NF (`npm run db:migrate`) и сиды демонстрационных данных (`npm run db:seed:all`).
4. Запускаются **Prometheus** и **Grafana** с автоматическим provisioning источников данных, дашбордов и правил алертинга.
5. **Nginx** начинает маршрутизацию клиентского трафика.

### Проверка работоспособности:
```bash
# Проверка статуса контейнеров (все должны быть Up/healthy):
docker compose ps

# Проверка liveness пробы:
curl -i http://localhost/api/health/live

# Проверка readiness пробы (проверка связи с PostgreSQL):
curl -i http://localhost/api/health/ready
```

---

## 3. Точки доступа к сервисам

| Сервис | URL | Назначение |
|---|---|---|
| **API & Gateway** | `http://localhost/api` | Основной программный интерфейс через Nginx |
| **Swagger UI** | `http://localhost/api/docs/` | Интерактивная документация OpenAPI 3.0 с поддержкой Bearer JWT |
| **OpenAPI Spec** | `http://localhost/api/docs/json` | Спецификация OpenAPI 3.0 в формате JSON |
| **Grafana Dashboards** | `http://localhost:3001` | Дашборды мониторинга (анонимный Admin, пароль не требуется) |
| **Prometheus** | `http://localhost:9090` *(internal)* | Сервер сбора метрик |

---

## 4. Аутентификация, сессии и ролевая модель (RBAC & ABAC)

Сервис реализует двухфакторную модель аутентификации на базе стандартов безопасности OAuth 2.0 / IETF:

- **Access Token**: JWT, время жизни **15 минут**, передается в заголовке `Authorization: Bearer <token>`.
- **Refresh Token**: Криптографически стойкий токен, время жизни **7 дней**, хранится в защищенном `HttpOnly`, `SameSite=Strict` Cookie с путем `/api/auth`. Выбор `SameSite=Strict` обусловлен защитой от CSRF-атак: API и фронтенд работают в рамках одного домена, поэтому кросс-доменная отправка cookie не требуется и должна быть запрещена.
- **Token Rotation & Theft Detection**: При каждом обновлении токена через `POST /api/auth/refresh` старый refresh-токен немедленно инвалидируется в БД. Попытка повторного использования старого токена расценивается как кража — система **мгновенно отзывает все активные сессии пользователя**.
- **Timing-Safe Login**: Защита от перебора логинов по времени ответа (используется dummy-хеш при проверке несуществующих пользователей).

### Матрица ролей и прав доступа:

| Операция | viewer (клиент) | technician (техник) | admin (диспетчер) |
|---|:---:|:---:|:---:|
| Просмотр оборудования (`GET /api/equipment`) | ✅ | ✅ | ✅ |
| Создание / редактирование оборудования | ❌ | ❌ | ✅ |
| Удаление оборудования (`DELETE /api/equipment/:id`) | ❌ | ❌ | ✅ |
| Просмотр заявок (`GET /api/requests`) | ✅ | ✅ | ✅ |
| Создание заявки (`POST /api/requests`) | ❌ | ✅ | ✅ |
| Смена статуса **назначенной** заявки | ❌ | ✅ *(ABAC)* | ✅ |
| Смена статуса **чужой/неназначенной** заявки | ❌ | ❌ *(403 Forbidden)* | ✅ |
| Назначение / снятие бригад (`/assignees`) | ❌ | ❌ | ✅ |
| Удаление заявки (`DELETE /api/requests/:id`) | ❌ | ❌ | ✅ |
| Аналитические отчеты (`/api/reports/*`) | ✅ | ✅ | ✅ |

> **Defense-in-Depth**: Проверка принадлежности заявки технику выполняется на уровне сервисного слоя (`request.service.js`) через связующую сущность `request_assignees`, исключая доступ к чужим задачам даже в обход роутинга.

### Тестовые учетные записи:
- **Администратор**: `admin@energy.local` / `Password123!`
- **Техник**: `technician@energy.local` / `Password123!`
- **Наблюдатель (Viewer)**: `viewer@energy.local` / `Password123!`

---

## 5. Мониторинг, метрики и алертинг

Сервис собирает и экспортирует метрики в формате Prometheus через библиотеку `prom-client`:

### 1. RED Метрики (Request, Error, Duration):
- `http_requests_total` — общее число запросов с лейблами метода, маршрута и HTTP-статуса.
- `http_errors_total` — счетчик ошибок 4xx и 5xx.
- `http_request_duration_seconds` — гистограмма времени ответа сервиса (p50, p95, p99).

### 2. Системные метрики процесса Node.js (USE):
- `nodejs_eventloop_lag_seconds` — задержка Event Loop.
- `nodejs_heap_size_used_bytes`, `process_resident_memory_bytes` — использование оперативной памяти V8 и RSS.
- `process_cpu_user_seconds_total`, `process_cpu_system_seconds_total` — утилизация ядер процессора.
- `nodejs_active_handles_total` — дескрипторы активных сетевых соединений.

### 3. Бизнес-метрики (с дебаунсом 15 секунд):
- `maintenance_requests_total` — количество заявок по статусам (`new`, `in_progress`, `done`, `rejected`) и приоритетам.
- `maintenance_overdue_tasks_total` — количество просроченных регламентных задач.
- `maintenance_mttr_hours` — среднее время закрытия заявок (Mean Time To Repair).

### 4. Дашборды Grafana (авто-провижининг):
1. **Service Observability & Business Dashboard**:
   - Панели SLA, RED метрики (RPS, Error Rate %, Latency p95).
   - Распределение заявок по статусам и уровням критичности.
   - Сводные показатели просрочек и динамика MTTR.
2. **Node.js Application Runtime**:
   - Мониторинг сборщика мусора V8, утечек памяти, задержки событийного цикла и загрузки CPU.

### 5. Правила алертов:
- **CriticalServiceDown**: срабатывает при падении экземпляра приложения (`app_up == 0`).
- **High5xxErrorRate**: срабатывает при превышении доли серверных ошибок > 5% за 1 минуту.

---

## 6. Логирование и Graceful Shutdown

1. **Структурированный логгер Pino**:
   - Формат вывода: JSON в production, читаемый цветной текст в development.
   - Сквозной `requestId` (`X-Request-Id`) пробрасывается через контекст `AsyncLocalStorage`.
   - Автоматическое маскирование чувствительных данных (пароли, JWT, cookies).
2. **Синхронизация таймаутов (Zero Dropped Connections)**:
   - Nginx: `keepalive_timeout 60s`.
   - Node.js: `server.keepAliveTimeout = 65000` (65с), `server.headersTimeout = 66000` (66с). Это исключает гонку закрытия TCP-сокетов со стороны Node.js при активном Nginx.
3. **Graceful Shutdown**:
   - При получении `SIGTERM` или `SIGINT` метрика `app_up` немедленно переводится в 0.
   - Новые соединения отклоняются через `server.close()`.
   - Активным запросам дается время на завершение (таймаут 10с).
   - Пул соединений PostgreSQL закрывается корректно (`sequelize.close()`).

---

## 7. Локальный запуск и тестирование

### Запуск полного набора автотестов:
Тестовый набор включает модульные, интеграционные тесты и тесты документации (59 тестов):

```bash
npm test
```

### Запуск в режиме разработки:
```bash
# 1. Запустить БД в Docker:
docker compose up -d db

# 2. Установить зависимости:
npm install

# 3. Применить миграции и сиды:
npm run db:reset

# 4. Запустить локальный сервер с nodemon:
npm run dev
```

---

## 8. Эксплуатационный регламент (Runbook)

Подробные пошаговые инструкции для дежурного инженера по действиям в случае аварий (падение PostgreSQL, всплеск ошибок 5xx, переполнение диска, откат миграций схемы) вынесены в отдельный документ:

 [**RUNBOOK.md — Регламент действий при инцидентах**](./RUNBOOK.md)
