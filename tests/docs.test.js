import supertest from 'supertest';
import app from '../src/app.js';
import { sequelize } from '../src/lib/db.js';

describe('OpenAPI & Swagger Documentation Tests', () => {
  afterAll(async () => {
    await sequelize.close();
  });

  it('GET /api/docs/json возвращает валидную спецификацию OpenAPI 3.0', async () => {
    const res = await supertest(app).get('/api/docs/json');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body.openapi).toBe('3.0.3');
    expect(res.body.info).toBeDefined();
    expect(res.body.info.title).toContain('Equipment Maintenance REST API');
    expect(res.body.components.securitySchemes.bearerAuth).toBeDefined();
    expect(res.body.components.securitySchemes.cookieAuth).toBeDefined();
    expect(res.body.paths['/auth/login']).toBeDefined();
    expect(res.body.paths['/equipment']).toBeDefined();
    expect(res.body.paths['/requests']).toBeDefined();
    expect(res.body.paths['/health/live']).toBeDefined();
    expect(res.body.paths['/health/ready']).toBeDefined();
  });

  it('GET /api/docs/ возвращает Swagger UI HTML страницу', async () => {
    const res = await supertest(app).get('/api/docs/');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/html/);
    expect(res.text).toContain('swagger-ui');
  });

  it('Документация доступна публично без Bearer токена', async () => {
    const res = await supertest(app).get('/api/docs/json');
    expect(res.status).toBe(200);
  });
});
