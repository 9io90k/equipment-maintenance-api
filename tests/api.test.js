import supertest from 'supertest';
import app from '../src/app.js';
import { sequelize } from '../src/models/index.js';
import { signAccessToken } from '../src/lib/jwt.js';

const adminToken = signAccessToken({
  id: '77777777-7777-4777-8777-777777777001',
  email: 'admin@energy.local',
  role: 'admin',
});

const request = (targetApp) => {
  const reqObj = supertest(targetApp);
  return {
    get: (url) => reqObj.get(url).set('Authorization', `Bearer ${adminToken}`),
    post: (url) => reqObj.post(url).set('Authorization', `Bearer ${adminToken}`),
    patch: (url) => reqObj.patch(url).set('Authorization', `Bearer ${adminToken}`),
    put: (url) => reqObj.put(url).set('Authorization', `Bearer ${adminToken}`),
    delete: (url) => reqObj.delete(url).set('Authorization', `Bearer ${adminToken}`),
  };
};

describe('Equipment Maintenance REST API Tests', () => {
  let createdEquipmentId;
  let createdRequestId;
  const leadTechnicianId = '33333333-3333-4333-8333-333333333001';
  const memberTechnicianId = '33333333-3333-4333-8333-333333333002';
  const demoSiteId = '11111111-1111-4111-8111-111111111001';
  const cleanupTestRecords = async () => {
    try {
      await sequelize.query(`
        DELETE FROM maintenance_requests WHERE equipment_id IN (
          SELECT id FROM equipment WHERE serial_number LIKE 'SN-TEST-%'
        )
      `);
      await sequelize.query(`
        DELETE FROM equipment WHERE serial_number LIKE 'SN-TEST-%'
      `);
    } catch (e) {
      // ignore
    }
  };

  beforeAll(async () => {
    await cleanupTestRecords();
  });

  afterAll(async () => {
    await cleanupTestRecords();
    await sequelize.close();
  });

  describe('1. Health Check & Error Handling', () => {
    it('GET /api/health - должен возвращать 200 OK и статус ok', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status', 'ok');
      expect(res.body).toHaveProperty('uptime');
      expect(res.headers).toHaveProperty('x-request-id');
    });

    it('GET /api/health/live - проверка жизнеспособности процесса Node.js (200 OK)', async () => {
      const res = await request(app).get('/api/health/live');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status', 'up');
      expect(res.body).toHaveProperty('uptime');
      expect(res.body).toHaveProperty('timestamp');
    });

    it('GET /api/health/ready - готовность к обслуживанию с проверкой БД (200 OK)', async () => {
      const res = await request(app).get('/api/health/ready');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status', 'up');
      expect(res.body).toHaveProperty('services');
      expect(res.body.services).toHaveProperty('database', 'up');
    });

    it('GET /metrics - отдача метрик в формате Prometheus', async () => {
      const res = await request(app).get('/metrics');
      expect(res.status).toBe(200);
      expect(res.text).toContain('http_requests_total');
      expect(res.text).toContain('process_cpu_seconds_total');
    });

    it('GET /api/unknown - должен возвращать 404 в стандартном формате ошибки', async () => {
      const res = await request(app).get('/api/unknown');
      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toHaveProperty('code', 'NOT_FOUND');
      expect(res.body.error).toHaveProperty('requestId');
      expect(res.body.error).toHaveProperty('message');
    });
  });

  describe('2. Equipment CRUD & Validation', () => {
    it('POST /api/equipment - успешное создание оборудования (201 + Location)', async () => {
      const newEquipment = {
        name: 'Ветрогенератор Тестовый №1',
        type: 'wind_turbine',
        serialNumber: 'SN-TEST-001',
        location: { lat: 55.751244, lon: 37.618423 },
        status: 'operational',
        installedAt: '2024-01-15T00:00:00.000Z',
      };

      const res = await request(app)
        .post('/api/equipment')
        .send(newEquipment);

      expect(res.status).toBe(201);
      expect(res.headers).toHaveProperty('location');
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.serialNumber).toBe('SN-TEST-001');

      createdEquipmentId = res.body.data.id;
    });

    it('POST /api/equipment - 409 Conflict при дубликате serialNumber', async () => {
      const duplicate = {
        name: 'Ветрогенератор Дубль',
        type: 'wind_turbine',
        serialNumber: 'SN-TEST-001',
        location: { lat: 55.0, lon: 37.0 },
        installedAt: '2024-01-01T00:00:00.000Z',
      };

      const res = await request(app).post('/api/equipment').send(duplicate);
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
    });

    it('POST /api/equipment - 400 Validation Error при некорректных данных', async () => {
      const invalidData = {
        name: 'AB',
        type: 'unknown_type',
        serialNumber: 'SN-INVALID',
        location: { lat: 100, lon: 37 },
        installedAt: '2099-01-01T00:00:00.000Z',
      };

      const res = await request(app).post('/api/equipment').send(invalidData);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(Array.isArray(res.body.error.details)).toBe(true);
      expect(res.body.error.details.length).toBeGreaterThan(0);
    });

    it('POST /api/equipment - неизвестные поля тела запроса игнорируются (strip)', async () => {
      const dataWithUnknownField = {
        name: 'Турбина с лишними полями',
        type: 'wind_turbine',
        serialNumber: 'SN-EXTRA-002',
        location: { lat: 55.75, lon: 37.61 },
        installedAt: '2024-02-01T00:00:00.000Z',
        id: 'user-defined-id-attempt',
        createdAt: '1999-01-01T00:00:00.000Z',
        unexpectedCustomProperty: 'should-be-ignored',
      };

      const res = await request(app).post('/api/equipment').send(dataWithUnknownField);
      expect(res.status).toBe(201);
      expect(res.body.data.id).not.toBe('user-defined-id-attempt');
      expect(res.body.data.createdAt).not.toBe('1999-01-01T00:00:00.000Z');
      expect(res.body.data.unexpectedCustomProperty).toBeUndefined();

      await request(app).delete(`/api/equipment/${res.body.data.id}`);
    });

    it('GET /api/equipment - получение списка с метаданными пагинации', async () => {
      const res = await request(app).get('/api/equipment?page=1&limit=10');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta.page).toBe(1);
      expect(res.body.meta.limit).toBe(10);
      expect(res.body.meta.total).toBeGreaterThanOrEqual(1);
    });

    it('GET /api/equipment - фильтрация по диапазону дат (installedFrom, installedTo)', async () => {
      const matchRes = await request(app).get(
        '/api/equipment?installedFrom=2024-01-01T00:00:00.000Z&installedTo=2024-12-31T23:59:59.999Z'
      );
      expect(matchRes.status).toBe(200);
      expect(matchRes.body.data.length).toBeGreaterThanOrEqual(1);

      const noMatchRes = await request(app).get(
        '/api/equipment?installedFrom=2090-01-01T00:00:00.000Z'
      );
      expect(noMatchRes.status).toBe(200);
      expect(noMatchRes.body.data.length).toBe(0);
    });

    it('GET /api/equipment/:id - получение карточки по ID', async () => {
      const res = await request(app).get(`/api/equipment/${createdEquipmentId}`);
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(createdEquipmentId);
    });

    it('PATCH /api/equipment/:id - частичное обновление', async () => {
      const res = await request(app)
        .patch(`/api/equipment/${createdEquipmentId}`)
        .send({ status: 'under_maintenance' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('under_maintenance');
    });
  });

  describe('3. Maintenance Requests CRUD, Brigade & State Machine', () => {
    it('POST /api/requests - 404 при создании заявки на несуществующее оборудование', async () => {
      const nonExistentEquipmentId = 'a0000000-0000-0000-0000-000000000000';
      const res = await request(app).post('/api/requests').send({
        equipmentId: nonExistentEquipmentId,
        title: 'Ремонт несуществующего оборудования',
        priority: 'high',
      });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('POST /api/requests - успешное создание заявки (201 + Location)', async () => {
      const newRequest = {
        equipmentId: createdEquipmentId,
        title: 'Замена подшипника турбины',
        description: 'Срочная замена подшипника основного вала',
        priority: 'critical',
      };

      const res = await request(app).post('/api/requests').send(newRequest);
      expect(res.status).toBe(201);
      expect(res.headers).toHaveProperty('location');
      expect(res.body.data.status).toBe('new');
      expect(res.body.data.equipmentId).toBe(createdEquipmentId);

      createdRequestId = res.body.data.id;
    });

    it('PATCH /api/requests/:id/status - 409 Conflict: запрет перехода в in_progress без бригады', async () => {
      const res = await request(app)
        .patch(`/api/requests/${createdRequestId}/status`)
        .send({ status: 'in_progress' });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
      expect(res.body.error.message).toContain('без назначенных исполнителей');
    });

    it('POST /api/requests/:id/assignees - 422 Unprocessable Entity если в бригаде нет lead', async () => {
      const res = await request(app)
        .post(`/api/requests/${createdRequestId}/assignees`)
        .send({
          assignees: [
            { technicianId: memberTechnicianId, role: 'member', hours: 2 },
          ],
        });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('UNPROCESSABLE_ENTITY');
      expect(res.body.error.message).toContain('ровно одного ведущего специалиста');
    });

    it('POST /api/requests/:id/assignees - 422 Unprocessable Entity если в бригаде больше одного lead', async () => {
      const res = await request(app)
        .post(`/api/requests/${createdRequestId}/assignees`)
        .send({
          assignees: [
            { technicianId: leadTechnicianId, role: 'lead', hours: 4 },
            { technicianId: memberTechnicianId, role: 'lead', hours: 2 },
          ],
        });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('UNPROCESSABLE_ENTITY');
    });

    it('POST /api/requests/:id/assignees - 404 Not Found при назначении несуществующего специалиста', async () => {
      const res = await request(app)
        .post(`/api/requests/${createdRequestId}/assignees`)
        .send({
          assignees: [
            { technicianId: '00000000-0000-0000-0000-000000000000', role: 'lead', hours: 1 },
          ],
        });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('POST /api/requests/:id/assignees - 409 Conflict при дубликате специалиста в бригаде', async () => {
      const res = await request(app)
        .post(`/api/requests/${createdRequestId}/assignees`)
        .send({
          assignees: [
            { technicianId: leadTechnicianId, role: 'lead', hours: 3 },
            { technicianId: leadTechnicianId, role: 'member', hours: 2 },
          ],
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
    });

    it('POST /api/requests/:id/assignees - успешное назначение бригады (201 Created)', async () => {
      const res = await request(app)
        .post(`/api/requests/${createdRequestId}/assignees`)
        .send({
          assignees: [
            { technicianId: leadTechnicianId, role: 'lead', hours: 4.5 },
            { technicianId: memberTechnicianId, role: 'member', hours: 2.0 },
          ],
        });

      expect(res.status).toBe(201);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(2);
    });

    it('DELETE /api/requests/:id/assignees/:technicianId - снятие специалиста с заявки (204 No Content)', async () => {
      const res = await request(app).delete(
        `/api/requests/${createdRequestId}/assignees/${memberTechnicianId}`
      );
      expect(res.status).toBe(204);

      // Повторное удаление возвращает 404
      const secondRes = await request(app).delete(
        `/api/requests/${createdRequestId}/assignees/${memberTechnicianId}`
      );
      expect(secondRes.status).toBe(404);
      expect(secondRes.body.error.code).toBe('NOT_FOUND');
    });

    it('PATCH /api/requests/:id/status - смена статуса new -> in_progress (200 OK после назначения бригады)', async () => {
      const res = await request(app)
        .patch(`/api/requests/${createdRequestId}/status`)
        .send({ status: 'in_progress' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('in_progress');
    });

    it('PATCH /api/requests/:id/status - 409 Conflict при недопустимом переходе (in_progress -> new)', async () => {
      const res = await request(app)
        .patch(`/api/requests/${createdRequestId}/status`)
        .send({ status: 'new' });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
    });

    it('PATCH /api/requests/:id/status - перевод in_progress -> done (200 OK)', async () => {
      const res = await request(app)
        .patch(`/api/requests/${createdRequestId}/status`)
        .send({ status: 'done' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('done');
    });

    it('PATCH /api/requests/:id/status - 409 Conflict: из статуса done переходы запрещены', async () => {
      const res = await request(app)
        .patch(`/api/requests/${createdRequestId}/status`)
        .send({ status: 'in_progress' });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
    });

    it('GET /api/requests/:id/history - получение аудиторского следа смены статусов', async () => {
      const res = await request(app).get(`/api/requests/${createdRequestId}/history`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(3);
      const statuses = res.body.data.map((h) => h.newStatus);
      expect(statuses).toContain('new');
      expect(statuses).toContain('in_progress');
      expect(statuses).toContain('done');
    });

    it('DELETE /api/requests/:id - удаление заявки (204 No Content)', async () => {
      const res = await request(app).delete(`/api/requests/${createdRequestId}`);
      expect(res.status).toBe(204);

      const checkRes = await request(app).get(`/api/requests/${createdRequestId}`);
      expect(checkRes.status).toBe(404);
    });

    it('DELETE /api/equipment/:id - 204 No Content после удаления всех заявок', async () => {
      const res = await request(app).delete(`/api/equipment/${createdEquipmentId}`);
      expect(res.status).toBe(204);
    });
  });

  describe('4. Weather Endpoint Integration', () => {
    beforeAll(() => {
      jest.spyOn(global, 'fetch').mockImplementation(async () => {
        return {
          ok: true,
          json: async () => ({
            daily: {
              time: ['2023-05-10', '2023-05-11', '2023-05-12'],
              temperature_2m_max: [20, 22, 21],
              temperature_2m_min: [10, 11, 10],
              precipitation_sum: [0, 0, 0],
              wind_speed_10m_max: [5, 6, 5],
            },
          }),
        };
      });
    });

    afterAll(() => {
      jest.restoreAllMocks();
    });

    it('GET /api/equipment/:id/weather - 404 для несуществующего оборудования', async () => {
      const res = await request(app).get('/api/equipment/00000000-0000-0000-0000-000000000000/weather');
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('GET /api/equipment/:id/weather - возвращает прогноз и оценку пригодности для наружных работ', async () => {
      const equipRes = await request(app).post('/api/equipment').send({
        name: 'Ветропарк Тестовый Юг',
        type: 'wind_turbine',
        serialNumber: 'SN-WEATHER-01',
        location: { lat: 45.0355, lon: 38.9753 },
        installedAt: '2023-05-10T00:00:00.000Z',
      });
      const equipId = equipRes.body.data.id;

      try {
        const weatherRes = await request(app).get(`/api/equipment/${equipId}/weather`);
        if (weatherRes.status === 200) {
          expect(weatherRes.body.data).toHaveProperty('equipment');
          expect(weatherRes.body.data).toHaveProperty('forecast');
          expect(weatherRes.body.data).toHaveProperty('safetyThresholds');
          expect(Array.isArray(weatherRes.body.data.forecast)).toBe(true);
        } else {
          expect([502, 503, 504]).toContain(weatherRes.status);
          expect(weatherRes.body).toHaveProperty('error');
        }
      } finally {
        await request(app).delete(`/api/equipment/${equipId}`);
      }
    });
  });

  describe('5. Sites & Equipment-Load Analytical Reports (Case 3)', () => {
    it('GET /api/sites - получение списка производственных площадок', async () => {
      const res = await request(app).get('/api/sites');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('GET /api/sites/:id/summary - сводка по площадке с SQL-агрегатами', async () => {
      const res = await request(app).get(`/api/sites/${demoSiteId}/summary`);
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('site');
      expect(res.body.data.site.id).toBe(demoSiteId);
      expect(res.body.data).toHaveProperty('metrics');
      expect(res.body.data.metrics).toHaveProperty('totalEquipment');
      expect(res.body.data.metrics).toHaveProperty('totalNominalPower');
      expect(res.body.data.metrics).toHaveProperty('requestsByStatus');
      expect(res.body.data.metrics).toHaveProperty('requestsByPriority');
      expect(res.body.data.metrics).toHaveProperty('avgResolutionTimeHours');
    });

    it('GET /api/sites/:id/summary - 404 для несуществующей площадки', async () => {
      const res = await request(app).get('/api/sites/00000000-0000-0000-0000-000000000000/summary');
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('GET /api/reports/equipment-load - Raw SQL отчёт по нагрузке на каждую единицу оборудования', async () => {
      const res = await request(app).get('/api/reports/equipment-load');
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('overall');
      expect(res.body.data).toHaveProperty('breakdown');
      expect(Array.isArray(res.body.data.breakdown)).toBe(true);
      if (res.body.data.breakdown.length > 0) {
        const row = res.body.data.breakdown[0];
        expect(row).toHaveProperty('equipmentId');
        expect(row).toHaveProperty('equipmentName');
        expect(row).toHaveProperty('serialNumber');
        expect(row).toHaveProperty('totalRequests');
        expect(row).toHaveProperty('closedRequests');
        expect(row).toHaveProperty('totalPlannedHours');
        expect(row).toHaveProperty('lastMaintenanceDate');
      }
    });

    it('GET /api/reports/equipment-load?minRequests=2 - фильтрация групп через HAVING', async () => {
      const res = await request(app).get('/api/reports/equipment-load?minRequests=2');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.breakdown)).toBe(true);
      for (const row of res.body.data.breakdown) {
        expect(row.totalRequests).toBeGreaterThanOrEqual(2);
      }
    });
  });

  describe('6. Transaction Atomicity & Rollback Demonstration (Item 28)', () => {
    it('ROLLBACK: при ошибке в транзакции изменения откатываются и запись не сохраняется в БД', async () => {
      const { MaintenanceRequest, Equipment } = await import('../src/models/index.js');
      const validEquipment = await Equipment.findOne();
      const testReqId = '88888888-8888-4888-8888-888888888888';

      // Попытка выполнения транзакции с искусственной ошибкой на 2-м шаге
      let caughtError = null;
      try {
        await sequelize.transaction(async (t) => {
          // Шаг 1: Создаем заявку в транзакции
          await MaintenanceRequest.create(
            {
              id: testReqId,
              equipmentId: validEquipment.id,
              title: 'Транзакционная тестовая заявка',
              priority: 'low',
              status: 'new',
            },
            { transaction: t }
          );

          // Шаг 2: Искусственный сбой (выброс исключения перед коммитом)
          throw new Error('Simulated mid-transaction failure for rollback testing');
        });
      } catch (err) {
        caughtError = err;
      }

      expect(caughtError).not.toBeNull();
      expect(caughtError.message).toBe('Simulated mid-transaction failure for rollback testing');

      // Проверяем, что в БД заявка НЕ сохранилась (был выполнен чистый ROLLBACK)
      const foundInDb = await MaintenanceRequest.findByPk(testReqId);
      expect(foundInDb).toBeNull();
    });

    it('ETL Migration: миграция legacy-данных Case 2 выполняется без ошибок в транзакции', async () => {
      const { migrateLegacyData } = await import('../scripts/migrate-case2-data.js');
      const stats = await migrateLegacyData();
      expect(stats).toHaveProperty('equipmentCreated');
      expect(stats).toHaveProperty('requestsCreated');
      expect(stats).toHaveProperty('historyCreated');
    });
  });
});
