# Operational Runbook: Equipment Maintenance REST API

Настоящий эксплуатационный регламент (Runbook) предназначен для инженеров сопровождения, SRE и дежурных администраторов. В документе описаны процедуры мониторинга, диагностики и пошаговые алгоритмы локализации и устранения аварийных инцидентов.

---

## 1. Архитектура мониторинга и точки наблюдения

| Сервис | Порт | Протокол | Назначение |
|---|---|---|---|
| **Nginx Reverse Proxy** | `80` | HTTP | Единая входная точка, маршрутизация, RFC 9457 ошибки |
| **API Application** | `3000` *(internal)* | HTTP | Основной бизнес-сервис Node.js (Express 5) |
| **PostgreSQL 18** | `5432` *(internal/localhost)* | TCP | Реляционное 3NF хранилище |
| **Prometheus** | `9090` *(internal)* | HTTP | Сбор и хранение временных рядов метрик (интервал 10s) |
| **Grafana** | `3001` | HTTP | Визуализация дашбордов и управление алертами |

### Быстрые ссылки для диагностики:
- **Liveness Probe**: `curl -i http://localhost/api/health/live`
- **Readiness Probe**: `curl -i http://localhost/api/health/ready`
- **Метрики Prometheus**: `curl -i http://localhost/metrics` *(доступ только из внутренних подсетей)*
- **Интерактивная документация**: `http://localhost/api/docs/`
- **Дашборды Grafana**: `http://localhost:3001` *(авторизован как Admin по умолчанию)*

---

## 2. Мониторинг логов

Все сервисы пишут структурированные логи в `stdout`/`stderr` в формате JSON:

```bash
# Просмотр логов всех сервисов в реальном времени:
docker compose logs -f

# Просмотр логов только API приложения:
docker compose logs -f api

# Просмотр логов с фильтрацией ошибок:
docker compose logs api | grep '"level":"error"'

# Просмотр логов реверс-прокси Nginx:
docker compose logs -f nginx
```

Каждая запись лога API содержит сквозной идентификатор запроса `requestId` (`X-Request-Id`), что позволяет сопоставить запись в access-логе Nginx с трассировкой в Node.js и запросами к СУБД.

---

## 3. Регламенты действий при типовых авариях (Incident Playbooks)

### Инцидент 1: Отказ СУБД PostgreSQL (`Database Unavailable`)

**Симптомы:**
- Readiness-проба `GET /api/health/ready` возвращает HTTP `503 Service Unavailable`:
  ```json
  { "status": "down", "services": { "database": "down" }, "error": "Database connection failed" }
  ```
- В логах API фиксируются ошибки `SequelizeConnectionError` или `Connection refused`.
- В Grafana срабатывает алерт доступности сервиса.

**Порядок устранения:**
1. Проверить статус контейнера базы данных:
   ```bash
   docker compose ps db
   ```
2. Проверить логи PostgreSQL на предмет ошибок инициализации, повреждения данных или нехватки памяти:
   ```bash
   docker compose logs db --tail=100
   ```
3. Если контейнер остановлен или находится в статусе `unhealthy`:
   ```bash
   # Перезапустить сервис БД:
   docker compose restart db
   
   # Дождаться статуса healthy:
   docker compose ps db
   ```
4. Проверить восстановление соединения:
   ```bash
   curl -i http://localhost/api/health/ready
   ```
   *(Ожидается ответ `HTTP/1.1 200 OK` с телом `{"status":"up","services":{"database":"up"}}`).*

---

### Инцидент 2: Всплеск доли ошибок 5xx (> 5%)

**Симптомы:**
- В Grafana срабатывает алерт **High5xxRate** (`http_errors_total / http_requests_total > 0.05`).
- Клиенты получают ответы `500 Internal Server Error` или `502 Bad Gateway`.

**Порядок устранения:**
1. Выяснить, отдает ошибки Nginx (502/503/504) или само Node.js API (500):
   ```bash
   docker compose logs --tail=100 nginx | grep -E '"status":(500|502|503|504)'
   ```
2. Если Nginx отдает `502 Bad Gateway` — проверить состояние Node.js процесса:
   ```bash
   docker compose ps api
   docker compose logs api --tail=50
   ```
   - Если Node.js упал из-за необработанного исключения (OOM, unhandled rejection) — перезапустить контейнер:
     ```bash
     docker compose restart api
     ```
3. Если Node.js отвечает `500`:
   - Найти в логах API стек ошибки по `requestId`:
     ```bash
     docker compose logs api | grep '"status":500'
     ```
   - Локализовать проблемный эндпоинт и параметры запроса.

---

### Инцидент 3: Переполнение дискового пространства

**Симптомы:**
- PostgreSQL переходит в режим read-only.
- Сборка образов или запуск контейнеров завершаются ошибкой `no space left on device`.

**Порядок устранения:**
1. Проверить использование диска Docker:
   ```bash
   docker system df
   ```
2. Удалить неиспользуемые анонимные тома, остановленные контейнеры и висячие слои сборки (dangling images):
   ```bash
   # Безопасная очистка кэша без удаления персистентных данных:
   docker system prune -f
   
   # Очистка неиспользуемых томов (ВНИМАНИЕ: не затрагивает именованные pgdata, prometheus_data, grafana_data):
   docker volume prune -f
   ```
3. Проверить размер каталога данных PostgreSQL:
   ```bash
   docker compose exec db du -sh /var/lib/postgresql/data
   ```

---

### Инцидент 4: Процедура отката миграций базы данных

Если после релиза новой версии обнаружена критическая ошибка в схеме данных, необходимо выполнить контролируемый откат миграции.

**Порядок отката:**
1. Проверить текущий статус миграций:
   ```bash
   docker compose exec api npm run db:migrate:status
   ```
2. Откатить последнюю примененную миграцию:
   ```bash
   docker compose exec api npm run db:migrate:undo
   ```
3. Если требуется полный откат всех миграций схемы (только для тестовых стендов!):
   ```bash
   docker compose exec api npm run db:migrate:undo:all
   ```
4. Убедиться, что сервис стабильно отвечает на запросы:
   ```bash
   curl -i http://localhost/api/health/ready
   ```

---

### Инцидент 5: Обнаружение компрометации токена (Theft / Reuse Detection)

**Симптомы:**
- В логах API фиксируется предупреждение безопасности:
  ```json
  {"err":"Обнаружено повторное использование отозванного refresh-токена! Все активные сессии пользователя отозваны.","status":403,"code":"FORBIDDEN"}
  ```
- Клиент жалуется на внезапную необходимость повторного входа.

**Что произошло:**
Сработал встроенный механизм защиты от кражи сессий (**Token Reuse Detection**). Злоумышленник попытался использовать старый refresh-токен, который уже был ротирован легитимным клиентом. Система безопасности автоматически отозвала **абсолютно все сессии** скомпрометированного пользователя в таблице `refresh_tokens`.

**Действия инженера:**
1. Найти `userId` пострадавшего пользователя в логах.
2. Проверить IP-адреса и User-Agent подозрительных запросов в access-логе Nginx по идентификатору `requestId`.
3. Пользователю необходимо пройти процедуру повторной аутентификации через `POST /api/auth/login`. Дополнительных ручных действий в БД не требуется.

---

## 4. Регламент перезапуска стека (Zero-Downtime Maintenance)

```bash
# 1. Мягкая остановка стека (сохраняются все данные в томах):
docker compose down

# 2. Обновление образов и запуск в фоне:
docker compose up -d --build

# 3. Контроль прохождения проверок жизнеспособности (healthchecks):
docker compose ps

# 4. Проверка доступности через внешний порт 80:
curl -i http://localhost/api/health/live
curl -i http://localhost/api/health/ready
```
