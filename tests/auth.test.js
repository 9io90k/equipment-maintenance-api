import request from 'supertest';
import app from '../src/app.js';
import { sequelize, User, Equipment, MaintenanceRequest, RequestAssignee } from '../src/models/index.js';
import { signAccessToken } from '../src/lib/jwt.js';

describe('Authentication & RBAC Tests (Phase 1)', () => {
  const testAdminId = '77777777-7777-4777-8777-777777777001';
  const testTechId = '77777777-7777-4777-8777-777777777002';
  const testViewerId = '77777777-7777-4777-8777-777777777003';
  const assignedTechUuid = '33333333-3333-4333-8333-333333333001';

  let adminToken;
  let technicianToken;
  let viewerToken;

  beforeAll(async () => {
    adminToken = signAccessToken({
      id: testAdminId,
      email: 'admin@energy.local',
      role: 'admin',
    });

    technicianToken = signAccessToken({
      id: testTechId,
      email: 'technician@energy.local',
      role: 'technician',
      technicianId: assignedTechUuid,
    });

    viewerToken = signAccessToken({
      id: testViewerId,
      email: 'viewer@energy.local',
      role: 'viewer',
    });
  });

  afterAll(async () => {
    try {
      await User.destroy({ where: { email: 'newuser@energy.local' } });
      await MaintenanceRequest.destroy({
        where: { title: ['Заявка для другого техника', 'Заявка админа', 'Технический осмотр лопастей', 'Заявка для проверки техника'] },
      });
    } catch {
      // ignore
    }
    await sequelize.close();
  });

  describe('1. Authentication Endpoints', () => {
    it('POST /api/auth/register - успешная регистрация нового пользователя', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'newuser@energy.local',
          password: 'Password123!',
          role: 'viewer',
        });

      expect(res.status).toBe(201);
      expect(res.body.data).toHaveProperty('user');
      expect(res.body.data.user.email).toBe('newuser@energy.local');
      expect(res.body.data.user.role).toBe('viewer');
      expect(res.body.data.user).not.toHaveProperty('passwordHash');
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.headers['set-cookie']).toBeDefined();
    });

    it('POST /api/auth/register - 409 при попытке зарегистрировать дубликат email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'newuser@energy.local',
          password: 'Password123!',
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
    });

    it('POST /api/auth/register - 400 при слишком коротком пароле (< 8 символов)', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'shortpass@energy.local',
          password: '123',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('POST /api/auth/register - 400 при попытке зарегистрироваться с ролью admin', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'hacker@energy.local',
          password: 'Password123!',
          role: 'admin',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('POST /api/auth/login - успешный вход с выдачей access-токена и refresh-cookie', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@energy.local',
          password: 'Password123!',
        });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data.user.email).toBe('admin@energy.local');
      expect(res.headers['set-cookie']).toBeDefined();
      expect(res.headers['set-cookie'][0]).toContain('refreshToken=');
      expect(res.headers['set-cookie'][0]).toContain('HttpOnly');
    });

    it('POST /api/auth/login - 401 и единая ошибка при неверном пароле', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@energy.local',
          password: 'WrongPassword!',
        });

      expect(res.status).toBe(401);
      expect(res.body.error.message).toBe('Неверные учетные данные');
    });

    it('POST /api/auth/login - 401 и единая ошибка при несуществующем пользователе', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@energy.local',
          password: 'AnyPassword123!',
        });

      expect(res.status).toBe(401);
      expect(res.body.error.message).toBe('Неверные учетные данные');
    });

    it('GET /api/auth/me - успешное получение данных текущего пользователя', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.email).toBe('admin@energy.local');
      expect(res.body.data.role).toBe('admin');
      expect(res.body.data).not.toHaveProperty('passwordHash');
    });

    it('GET /api/auth/me - 401 при отсутствии токена', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('POST /api/auth/refresh - успешная ротация токенов по refresh-cookie', async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'viewer@energy.local',
          password: 'Password123!',
        });

      const cookie = loginRes.headers['set-cookie'];

      const refreshRes = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', cookie);

      expect(refreshRes.status).toBe(200);
      expect(refreshRes.body.data).toHaveProperty('accessToken');
      expect(refreshRes.headers['set-cookie']).toBeDefined();
    });

    it('POST /api/auth/refresh - 403 при повторном использовании старого токена (Theft detection)', async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'viewer@energy.local',
          password: 'Password123!',
        });

      const cookie = loginRes.headers['set-cookie'];

      await request(app).post('/api/auth/refresh').set('Cookie', cookie);

      const reusedRes = await request(app).post('/api/auth/refresh').set('Cookie', cookie);
      expect(reusedRes.status).toBe(403);
    });

    it('POST /api/auth/logout - корректный выход и очистка сессии', async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'viewer@energy.local',
          password: 'Password123!',
        });

      const cookie = loginRes.headers['set-cookie'];

      const logoutRes = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', cookie);

      expect(logoutRes.status).toBe(200);
      expect(logoutRes.body.message).toContain('завершена');
    });
  });

  describe('2. RBAC & ABAC Route Protections', () => {
    it('Запрос к закрытому ресурсу /api/equipment без токена возвращает 401', async () => {
      const res = await request(app).get('/api/equipment');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('Роль viewer может читать /api/equipment (200 OK)', async () => {
      const res = await request(app)
        .get('/api/equipment')
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('Роль viewer получает 403 при попытке создания оборудования', async () => {
      const res = await request(app)
        .post('/api/equipment')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({
          name: 'Неавторизованный генератор',
          type: 'wind_turbine',
          serialNumber: 'SN-FORBIDDEN-01',
          location: { lat: 55.0, lon: 37.0 },
          status: 'operational',
          installedAt: '2023-01-01T00:00:00.000Z',
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('Роль technician может создавать заявку на обслуживание (201 Created)', async () => {
      const equip = await Equipment.findOne();
      const res = await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${technicianToken}`)
        .send({
          equipmentId: equip.id,
          title: 'Технический осмотр лопастей',
          description: 'Плановый осмотр оборудования техником',
          priority: 'medium',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.title).toBe('Технический осмотр лопастей');
    });

    it('Роль technician получает 403 при попытке смены статуса чужой/неназначенной заявки (ABAC)', async () => {
      const equip = await Equipment.findOne();
      const reqInstance = await MaintenanceRequest.create({
        equipmentId: equip.id,
        title: 'Заявка для другого техника',
        description: 'Чужая заявка',
        status: 'new',
        priority: 'high',
        author: 'Dispatcher',
      });

      const res = await request(app)
        .patch(`/api/requests/${reqInstance.id}/status`)
        .set('Authorization', `Bearer ${technicianToken}`)
        .send({ status: 'rejected', comment: 'Попытка отклонить чужую заявку' });

      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain('только тех заявок, на которые он назначен');

      await reqInstance.destroy();
    });

    it('Роль technician может менять статус заявки, на которую назначен (200 OK)', async () => {
      const equip = await Equipment.findOne();
      const reqInstance = await MaintenanceRequest.create({
        equipmentId: equip.id,
        title: 'Заявка для проверки техника',
        description: 'Своя заявка',
        status: 'new',
        priority: 'high',
        author: 'Dispatcher',
      });

      await RequestAssignee.create({
        requestId: reqInstance.id,
        technicianId: assignedTechUuid,
        role: 'lead',
        hours: 0,
      });

      const res = await request(app)
        .patch(`/api/requests/${reqInstance.id}/status`)
        .set('Authorization', `Bearer ${technicianToken}`)
        .send({ status: 'rejected', comment: 'Отклонено назначенным техником' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('rejected');

      await reqInstance.destroy();
    });

    it('Роль admin может менять статус любой заявки (200 OK)', async () => {
      const equip = await Equipment.findOne();
      const reqInstance = await MaintenanceRequest.create({
        equipmentId: equip.id,
        title: 'Заявка админа',
        description: 'Административное изменение',
        status: 'new',
        priority: 'low',
        author: 'Admin',
      });

      const res = await request(app)
        .patch(`/api/requests/${reqInstance.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'rejected', comment: 'Отклонено администратором' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('rejected');

      await reqInstance.destroy();
    });
  });
});
