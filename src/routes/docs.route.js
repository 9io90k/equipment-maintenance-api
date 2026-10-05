import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { openApiSpec } from '../docs/openapi.js';

const router = Router();

router.get('/json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  return res.json(openApiSpec);
});

const swaggerUiOptions = {
  customSiteTitle: 'Equipment Maintenance API — Swagger Docs',
  customCss: '.swagger-ui .topbar { display: none }',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    docExpansion: 'list',
    filter: true,
  },
};

router.use('/', swaggerUi.serve, swaggerUi.setup(openApiSpec, swaggerUiOptions));

export default router;
