import request from 'supertest';
import app from '../src/app.js';
import fs from 'node:fs/promises';
import path from 'node:path';

const DATA_DIR = path.resolve('data');

describe('Equipment Maintenance REST API Tests', () => {
  let createdEquipmentId;
  let createdRequestId;

  beforeAll(async () => {
    try {
      await fs.rm(DATA_DIR, { recursive: true, force: true });
    } catch {}
  });

  afterAll(async () => {
    try {
      await fs.rm(DATA_DIR, { recursive: true, force: true });
    } catch {}
  });


  describe('1. Health Check & Error Handling', () => {
    it('GET /api/health - должен возвращать 200 OK и статус ok', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status', 'ok');
      expect(res.body).toHaveProperty('uptime');
      expect(res.headers).toHaveProperty('x-request-id');
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
        type: 'turbine',
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
        type: 'turbine',
        serialNumber: 'SN-TEST-001',
        location: { lat: 55.0, lon: 37.0 },
        installedAt: '2024-01-01T00:00:00.000Z',
      };

      const res = await request(app).post('/api/equipment').send(duplicate);
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
    });

    it('POST /api/equipment - 400 Validation Error при некорректных данных (дата в будущем, лишнее поле)', async () => {
      const invalidData = {
        name: 'AB',
        type: 'unknown_type',
        serialNumber: 'SN-INVALID',
        location: { lat: 100, lon: 37 },
        installedAt: '2099-01-01T00:00:00.000Z',
        extraField: 'not allowed',
      };


      const res = await request(app).post('/api/equipment').send(invalidData);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(Array.isArray(res.body.error.details)).toBe(true);
      expect(res.body.error.details.length).toBeGreaterThan(0);
    });

    it('GET /api/equipment - получение списка с метаданными пагинации', async () => {
      const res = await request(app).get('/api/equipment?page=1&limit=10');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta).toEqual(
        expect.objectContaining({
          total: 1,
          page: 1,
          limit: 10,
        })
      );
    });

    it('GET /api/equipment/:id - получение карточки по ID', async () => {
      const res = await request(app).get(`/api/equipment/${createdEquipmentId}`);
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(createdEquipmentId);
    });

    it('PATCH /api/equipment/:id - частичное обновление', async () => {
      const res = await request(app)
        .patch(`/api/equipment/${createdEquipmentId}`)
        .send({ status: 'maintenance' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('maintenance');
    });
  });

  describe('3. Maintenance Requests CRUD & State Machine', () => {
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

    it('GET /api/equipment/:id/requests - вложенный эндпоинт заявок оборудования', async () => {
      const res = await request(app).get(`/api/equipment/${createdEquipmentId}/requests`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].id).toBe(createdRequestId);
    });

    it('DELETE /api/equipment/:id - 409 Conflict при попытке удалить оборудование с открытой заявкой', async () => {
      const res = await request(app).delete(`/api/equipment/${createdEquipmentId}`);
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
    });

    it('PATCH /api/requests/:id/status - смена статуса new -> in_progress (200 OK)', async () => {
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

    it('DELETE /api/equipment/:id - 204 No Content после закрытия всех заявок', async () => {
      const res = await request(app).delete(`/api/equipment/${createdEquipmentId}`);
      expect(res.status).toBe(204);
    });
  });
});
