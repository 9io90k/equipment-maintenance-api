export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Equipment Maintenance REST API',
    version: '1.0.0',
    description: `Промышленный REST API для учёта оборудования, заявок на техническое обслуживание, назначения бригад, контроля погодных условий и системной наблюдаемости (RED/USE метрики).

### Возможности сервиса:
- **Аутентификация & RBAC**: JWT Access (15 мин) + Refresh токен в HttpOnly Cookie (7 дней) с защитой от кражи (Theft Detection / Token Reuse).
- **Ролевая модель**: \`viewer\` (просмотр), \`technician\` (выполнение назначенных заявок), \`admin\` (диспетчер / полный доступ).
- **Оборудование & Заявки**: CRUD, смена статусов, история переходов, назначение бригад исполнителей, проверка погодных ограничений.
- **Аналитика**: Отчеты о загрузке оборудования и показателях технического обслуживания.
- **Наблюдаемость**: Healthchecks (\`/api/health/live\`, \`/api/health/ready\`), Prometheus метрики (\`/metrics\`), дашборды Grafana и алерты.`,
    contact: {
      name: 'Команда разработки Equipment Maintenance API',
    },
  },
  servers: [
    {
      url: '/api',
      description: 'API Gateway / Reverse Proxy (Nginx / Local)',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Access JWT токен (15 минут). Передавать в заголовке: `Authorization: Bearer <token>`',
      },
      cookieAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'refreshToken',
        description: 'Refresh токен (7 дней) хранится в HttpOnly, SameSite=Strict cookie по пути `/api/auth`',
      },
    },
    schemas: {
      ApiError: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              code: {
                type: 'string',
                example: 'VALIDATION_ERROR',
              },
              message: {
                type: 'string',
                example: 'Некорректные данные запроса',
              },
              details: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    field: { type: 'string', example: 'email' },
                    message: { type: 'string', example: 'Некорректный формат email' },
                  },
                },
              },
              requestId: {
                type: 'string',
                format: 'uuid',
                example: 'c64a3e21-0a67-4a0b-80df-269c5e31fa6b',
              },
            },
            required: ['code', 'message'],
          },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          email: { type: 'string', format: 'email' },
          role: { type: 'string', enum: ['viewer', 'technician', 'admin'] },
          technicianId: { type: 'string', format: 'uuid', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      RegisterRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'technician@example.com' },
          password: { type: 'string', minLength: 8, maxLength: 128, example: 'SecurePassword123!' },
          role: { type: 'string', enum: ['viewer', 'technician', 'admin'], default: 'viewer' },
          technicianId: { type: 'string', format: 'uuid', nullable: true },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'admin@example.com' },
          password: { type: 'string', example: 'AdminPassword123!' },
        },
      },
      AuthResponse: {
        type: 'object',
        properties: {
          message: { type: 'string', example: 'Вход выполнен успешно' },
          user: { $ref: '#/components/schemas/User' },
          accessToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
        },
      },
      EquipmentLocation: {
        type: 'object',
        required: ['lat', 'lon'],
        properties: {
          lat: { type: 'number', minimum: -90, maximum: 90, example: 55.7558 },
          lon: { type: 'number', minimum: -180, maximum: 180, example: 37.6173 },
        },
      },
      Equipment: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string', example: 'Турбина №1' },
          type: {
            type: 'string',
            enum: ['turbine', 'wind_turbine', 'solar_panel', 'inverter', 'sensor', 'substation'],
            example: 'wind_turbine',
          },
          serialNumber: { type: 'string', example: 'WT-2024-001' },
          location: { $ref: '#/components/schemas/EquipmentLocation' },
          status: {
            type: 'string',
            enum: ['operational', 'maintenance', 'under_maintenance', 'fault', 'decommissioned'],
            example: 'operational',
          },
          installedAt: { type: 'string', format: 'date-time' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      CreateEquipmentRequest: {
        type: 'object',
        required: ['name', 'type', 'serialNumber', 'location', 'installedAt'],
        properties: {
          name: { type: 'string', minLength: 3, maxLength: 100, example: 'Ветрогенератор Веста-42' },
          type: {
            type: 'string',
            enum: ['turbine', 'wind_turbine', 'solar_panel', 'inverter', 'sensor', 'substation'],
            example: 'wind_turbine',
          },
          serialNumber: { type: 'string', example: 'VG-7741' },
          location: { $ref: '#/components/schemas/EquipmentLocation' },
          status: {
            type: 'string',
            enum: ['operational', 'maintenance', 'under_maintenance', 'fault', 'decommissioned'],
            default: 'operational',
          },
          installedAt: { type: 'string', format: 'date-time', example: '2023-05-15T08:00:00.000Z' },
        },
      },
      UpdateEquipmentRequest: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 3, maxLength: 100 },
          type: {
            type: 'string',
            enum: ['turbine', 'wind_turbine', 'solar_panel', 'inverter', 'sensor', 'substation'],
          },
          serialNumber: { type: 'string' },
          location: { $ref: '#/components/schemas/EquipmentLocation' },
          status: {
            type: 'string',
            enum: ['operational', 'maintenance', 'under_maintenance', 'fault', 'decommissioned'],
          },
          installedAt: { type: 'string', format: 'date-time' },
        },
      },
      RequestAssignee: {
        type: 'object',
        properties: {
          technicianId: { type: 'string', format: 'uuid' },
          role: { type: 'string', enum: ['lead', 'member'], example: 'lead' },
          hours: { type: 'number', minimum: 0, example: 4.5 },
          fullName: { type: 'string', example: 'Иван Петров' },
          email: { type: 'string', format: 'email' },
        },
      },
      MaintenanceRequest: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          equipmentId: { type: 'string', format: 'uuid' },
          title: { type: 'string', example: 'Плановая замена подшипников' },
          description: { type: 'string', example: 'Диагностика вибрации и замена роликового подшипника' },
          priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'], example: 'high' },
          status: { type: 'string', enum: ['new', 'in_progress', 'done', 'rejected'], example: 'new' },
          plannedAt: { type: 'string', format: 'date-time', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          assignees: {
            type: 'array',
            items: { $ref: '#/components/schemas/RequestAssignee' },
          },
          equipment: { $ref: '#/components/schemas/Equipment' },
        },
      },
      CreateMaintenanceRequest: {
        type: 'object',
        required: ['equipmentId', 'title', 'priority'],
        properties: {
          equipmentId: { type: 'string', format: 'uuid' },
          title: { type: 'string', minLength: 5, maxLength: 120, example: 'Плановая смазка вала турбины' },
          description: { type: 'string', maxLength: 2000, example: 'Выполнить работы согласно регламенту ТО-2' },
          priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'], example: 'medium' },
          status: { type: 'string', enum: ['new', 'in_progress', 'done', 'rejected'], default: 'new' },
          plannedAt: { type: 'string', format: 'date-time', example: '2026-10-15T10:00:00.000Z' },
        },
      },
      UpdateMaintenanceRequest: {
        type: 'object',
        properties: {
          title: { type: 'string', minLength: 5, maxLength: 120 },
          description: { type: 'string', maxLength: 2000 },
          priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
          plannedAt: { type: 'string', format: 'date-time' },
        },
      },
      UpdateRequestStatus: {
        type: 'object',
        required: ['status'],
        properties: {
          status: { type: 'string', enum: ['new', 'in_progress', 'done', 'rejected'], example: 'in_progress' },
        },
      },
      AssignBrigadeRequest: {
        type: 'object',
        required: ['assignees'],
        properties: {
          assignees: {
            type: 'array',
            items: {
              type: 'object',
              required: ['technicianId'],
              properties: {
                technicianId: { type: 'string', format: 'uuid' },
                role: { type: 'string', enum: ['lead', 'member'], default: 'member' },
                hours: { type: 'number', minimum: 0, default: 0 },
              },
            },
          },
        },
      },
      WeatherInfo: {
        type: 'object',
        properties: {
          temperature: { type: 'number', example: 18.5 },
          windSpeed: { type: 'number', example: 6.2 },
          precipitation: { type: 'number', example: 0.0 },
          isSafeForOutdoorWork: { type: 'boolean', example: true },
          restrictions: {
            type: 'array',
            items: { type: 'string' },
            example: [],
          },
        },
      },
      Site: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string', example: 'Ветропарк Северный' },
          address: { type: 'string', example: 'Ленинградская обл., Выборгский р-н' },
          latitude: { type: 'number', example: 60.7132 },
          longitude: { type: 'number', example: 28.7499 },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      PaginatedResponse: {
        type: 'object',
        properties: {
          total: { type: 'integer', example: 42 },
          page: { type: 'integer', example: 1 },
          limit: { type: 'integer', example: 10 },
          totalPages: { type: 'integer', example: 5 },
        },
      },
    },
  },
  paths: {
    '/auth/register': {
      post: {
        tags: ['Authentication & Users'],
        summary: 'Регистрация нового пользователя',
        description: 'Создает учетную запись пользователя. Доступные роли: `viewer`, `technician`, `admin`.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RegisterRequest' },
            },
          },
        },
        responses: {
          201: {
            description: 'Пользователь успешно зарегистрирован',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string', example: 'Пользователь успешно зарегистрирован' },
                    user: { $ref: '#/components/schemas/User' },
                  },
                },
              },
            },
          },
          400: { description: 'Ошибка валидации входных данных', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
          409: { description: 'Пользователь с таким email уже существует', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Authentication & Users'],
        summary: 'Вход в систему (получение JWT)',
        description: 'Аутентифицирует пользователя. Возвращает краткоживущий `accessToken` (15 мин) в теле ответа и сохраняет `refreshToken` (7 дней) в защищенный `HttpOnly` Cookie.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginRequest' },
            },
          },
        },
        responses: {
          200: {
            description: 'Успешная аутентификация',
            headers: {
              'Set-Cookie': {
                description: 'refreshToken HttpOnly cookie',
                schema: { type: 'string', example: 'refreshToken=eyJhb...; Path=/api/auth; HttpOnly; SameSite=Strict' },
              },
            },
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthResponse' },
              },
            },
          },
          401: { description: 'Неверный email или пароль', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
          429: { description: 'Слишком много попыток входа (Rate limit)', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
        },
      },
    },
    '/auth/refresh': {
      post: {
        tags: ['Authentication & Users'],
        summary: 'Обновление пары токенов (Ротация)',
        description: 'Принимает текущий `refreshToken` из cookie, валидирует его в БД, генерирует новую пару токенов (ротация) и защищает от повторного использования (Theft Detection).',
        security: [{ cookieAuth: [] }],
        responses: {
          200: {
            description: 'Токены успешно обновлены',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string', example: 'Токен успешно обновлен' },
                    accessToken: { type: 'string' },
                  },
                },
              },
            },
          },
          401: { description: 'Refresh-токен отсутствует, истек или отозван', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
        },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Authentication & Users'],
        summary: 'Выход из системы',
        description: 'Отывает refresh-токен в базе данных и очищает клиентскую cookie.',
        security: [{ cookieAuth: [] }],
        responses: {
          200: {
            description: 'Выход успешно выполнен',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string', example: 'Выход выполнен успешно' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Authentication & Users'],
        summary: 'Профиль текущего пользователя',
        description: 'Возвращает данные пользователя, извлеченные из валидного JWT access токена.',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Данные текущего пользователя',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    user: { $ref: '#/components/schemas/User' },
                  },
                },
              },
            },
          },
          401: { description: 'Требуется аутентификация', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } } },
        },
      },
    },
    '/health/live': {
      get: {
        tags: ['System & Health'],
        summary: 'Liveness Probe (Kubernetes/Docker)',
        description: 'Проверка жизнеспособности процесса Node.js (без обращения к БД во избежание каскадных сбоев).',
        responses: {
          200: {
            description: 'Сервис жив',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'up' },
                    uptime: { type: 'number', example: 345.12 },
                    timestamp: { type: 'integer', example: 1728000000000 },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/health/ready': {
      get: {
        tags: ['System & Health'],
        summary: 'Readiness Probe (Проверка готовности и подключения к БД)',
        description: 'Проверяет активное подключение к PostgreSQL через пул соединений. Возвращает 503 при отказе БД.',
        responses: {
          200: {
            description: 'Сервис готов принимать трафик',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'up' },
                    uptime: { type: 'number', example: 345.12 },
                    timestamp: { type: 'integer', example: 1728000000000 },
                    services: {
                      type: 'object',
                      properties: {
                        database: { type: 'string', example: 'up' },
                      },
                    },
                  },
                },
              },
            },
          },
          503: {
            description: 'Сервис временно недоступен (БД недоступна)',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'down' },
                    services: {
                      type: 'object',
                      properties: {
                        database: { type: 'string', example: 'down' },
                      },
                    },
                    error: { type: 'string', example: 'Database connection failed' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/health': {
      get: {
        tags: ['System & Health'],
        summary: 'Базовый статус здоровья сервиса',
        responses: {
          200: { description: 'Статус OK' },
          503: { description: 'Статус Ошибка (БД недоступна)' },
        },
      },
    },
    '/equipment': {
      get: {
        tags: ['Equipment'],
        summary: 'Получить список оборудования с фильтрацией и пагинацией',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['operational', 'maintenance', 'under_maintenance', 'fault', 'decommissioned'] } },
          { name: 'type', in: 'query', schema: { type: 'string', enum: ['turbine', 'wind_turbine', 'solar_panel', 'inverter', 'sensor', 'substation'] } },
          { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Поиск по названию или серийному номеру' },
          { name: 'sortBy', in: 'query', schema: { type: 'string', enum: ['name', 'installedAt', 'createdAt', 'serialNumber'], default: 'createdAt' } },
          { name: 'sortOrder', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
        ],
        responses: {
          200: {
            description: 'Список оборудования',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { type: 'array', items: { $ref: '#/components/schemas/Equipment' } },
                    pagination: { $ref: '#/components/schemas/PaginatedResponse' },
                  },
                },
              },
            },
          },
          401: { description: 'Неавторизованный запрос' },
        },
      },
      post: {
        tags: ['Equipment'],
        summary: 'Создать новое оборудование',
        description: 'Требуется роль `admin`.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateEquipmentRequest' },
            },
          },
        },
        responses: {
          201: {
            description: 'Оборудование создано',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { $ref: '#/components/schemas/Equipment' },
                  },
                },
              },
            },
          },
          400: { description: 'Ошибка валидации' },
          401: { description: 'Неавторизованный запрос' },
          403: { description: 'Доступ запрещен (недостаточно прав)' },
        },
      },
    },
    '/equipment/{id}': {
      get: {
        tags: ['Equipment'],
        summary: 'Получить оборудование по UUID',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          200: {
            description: 'Карточка оборудования',
            content: { 'application/json': { schema: { type: 'object', properties: { data: { $ref: '#/components/schemas/Equipment' } } } } },
          },
          404: { description: 'Оборудование не найдено' },
        },
      },
      patch: {
        tags: ['Equipment'],
        summary: 'Обновить параметры оборудования',
        description: 'Требуется роль `admin`.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateEquipmentRequest' },
            },
          },
        },
        responses: {
          200: { description: 'Оборудование обновлено', content: { 'application/json': { schema: { type: 'object', properties: { data: { $ref: '#/components/schemas/Equipment' } } } } } },
          404: { description: 'Оборудование не найдено' },
        },
      },
      delete: {
        tags: ['Equipment'],
        summary: 'Удалить оборудование',
        description: 'Требуется роль `admin`.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          204: { description: 'Оборудование успешно удалено' },
          404: { description: 'Оборудование не найдено' },
        },
      },
    },
    '/equipment/{id}/requests': {
      get: {
        tags: ['Equipment'],
        summary: 'Получить все заявки по данному оборудованию',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          200: {
            description: 'Список связанных заявок на обслуживание',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { type: 'array', items: { $ref: '#/components/schemas/MaintenanceRequest' } },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/equipment/{id}/weather': {
      get: {
        tags: ['Equipment'],
        summary: 'Получить текущие погодные условия на локации оборудования',
        description: 'Запрашивает координаты оборудования и валидирует безопасность проведения наружных работ (ветер, осадки).',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          200: {
            description: 'Погодные условия и допуск к работам',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { $ref: '#/components/schemas/WeatherInfo' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/requests': {
      get: {
        tags: ['Maintenance Requests'],
        summary: 'Получить список заявок на техническое обслуживание',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['new', 'in_progress', 'done', 'rejected'] } },
          { name: 'priority', in: 'query', schema: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] } },
          { name: 'equipmentId', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'sortBy', in: 'query', schema: { type: 'string', enum: ['title', 'plannedAt', 'createdAt'], default: 'createdAt' } },
          { name: 'sortOrder', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
        ],
        responses: {
          200: {
            description: 'Список заявок',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { type: 'array', items: { $ref: '#/components/schemas/MaintenanceRequest' } },
                    pagination: { $ref: '#/components/schemas/PaginatedResponse' },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Maintenance Requests'],
        summary: 'Создать заявку на обслуживание',
        description: 'Доступно ролям `technician` и `admin`.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateMaintenanceRequest' },
            },
          },
        },
        responses: {
          201: {
            description: 'Заявка создана',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { $ref: '#/components/schemas/MaintenanceRequest' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/requests/{id}': {
      get: {
        tags: ['Maintenance Requests'],
        summary: 'Получить заявку по ID',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          200: {
            description: 'Данные заявки',
            content: { 'application/json': { schema: { type: 'object', properties: { data: { $ref: '#/components/schemas/MaintenanceRequest' } } } } },
          },
          404: { description: 'Заявка не найдена' },
        },
      },
      patch: {
        tags: ['Maintenance Requests'],
        summary: 'Редактировать параметры заявки',
        description: 'Доступно ролям `technician` и `admin`.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateMaintenanceRequest' },
            },
          },
        },
        responses: {
          200: { description: 'Заявка обновлена', content: { 'application/json': { schema: { type: 'object', properties: { data: { $ref: '#/components/schemas/MaintenanceRequest' } } } } } },
        },
      },
      delete: {
        tags: ['Maintenance Requests'],
        summary: 'Удалить заявку',
        description: 'Доступно только `admin`.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          204: { description: 'Заявка удалена' },
        },
      },
    },
    '/requests/{id}/status': {
      patch: {
        tags: ['Maintenance Requests'],
        summary: 'Изменить статус заявки (Workflow)',
        description: 'Изменяет статус (`new` -> `in_progress` -> `done`/`rejected`). Техник может менять статус только назначенной на него заявки (Defense in Depth).',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateRequestStatus' },
            },
          },
        },
        responses: {
          200: { description: 'Статус успешно изменен', content: { 'application/json': { schema: { type: 'object', properties: { data: { $ref: '#/components/schemas/MaintenanceRequest' } } } } } },
          403: { description: 'Техник не назначен на данную заявку' },
          409: { description: 'Недопустимый переход статуса' },
        },
      },
    },
    '/requests/{id}/history': {
      get: {
        tags: ['Maintenance Requests'],
        summary: 'История изменений статусов заявки',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          200: {
            description: 'Хронология смены статусов',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          fromStatus: { type: 'string' },
                          toStatus: { type: 'string' },
                          changedAt: { type: 'string', format: 'date-time' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/requests/{id}/assignees': {
      post: {
        tags: ['Maintenance Requests'],
        summary: 'Назначить бригаду специалистов на заявку',
        description: 'Требуется роль `admin`. Позволяет привязать специалистов к заявке с указанием роли (`lead`, `member`) и часов.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AssignBrigadeRequest' },
            },
          },
        },
        responses: {
          200: { description: 'Бригада успешно назначена', content: { 'application/json': { schema: { type: 'object', properties: { data: { $ref: '#/components/schemas/MaintenanceRequest' } } } } } },
        },
      },
    },
    '/requests/{id}/assignees/{technicianId}': {
      delete: {
        tags: ['Maintenance Requests'],
        summary: 'Удалить специалиста из бригады по заявке',
        description: 'Требуется роль `admin`.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'technicianId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          200: { description: 'Специалист удален из заявки' },
        },
      },
    },
    '/sites': {
      get: {
        tags: ['Sites & Locations'],
        summary: 'Список производственных площадок',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Список площадок',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { type: 'array', items: { $ref: '#/components/schemas/Site' } },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/sites/{id}': {
      get: {
        tags: ['Sites & Locations'],
        summary: 'Получить площадку по ID',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          200: {
            description: 'Данные площадки',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { $ref: '#/components/schemas/Site' },
                  },
                },
              },
            },
          },
          404: { description: 'Площадка не найдена' },
        },
      },
    },
    '/sites/{id}/summary': {
      get: {
        tags: ['Sites & Locations'],
        summary: 'Сводка по площадке (количество оборудования и активных заявок)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          200: {
            description: 'Агрегированные данные по площадке',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'object',
                      properties: {
                        siteId: { type: 'string', format: 'uuid' },
                        totalEquipment: { type: 'integer' },
                        activeRequests: { type: 'integer' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/reports/equipment-load': {
      get: {
        tags: ['Reports & Analytics'],
        summary: 'Отчет о загрузке оборудования',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date-time' } },
          { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date-time' } },
          { name: 'siteId', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'minRequests', in: 'query', schema: { type: 'integer' } },
        ],
        responses: {
          200: {
            description: 'Аналитический отчет по нагрузке',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { type: 'array', items: { type: 'object' } },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/reports/maintenance': {
      get: {
        tags: ['Reports & Analytics'],
        summary: 'Отчет о техническом обслуживании и закрытии заявок',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date-time' } },
          { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date-time' } },
          { name: 'siteId', in: 'query', schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          200: {
            description: 'Статистика ТО',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { type: 'array', items: { type: 'object' } },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

export default openApiSpec;
