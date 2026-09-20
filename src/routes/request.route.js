import { Router } from 'express';
import { requestController } from '../controllers/request.controller.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  createRequestSchema,
  updateRequestSchema,
  updateRequestStatusSchema,
  requestIdParamSchema,
  queryRequestSchema,
} from '../validators/request.validator.js';

const router = Router();

router.route('/')
  .get(validate({ query: queryRequestSchema }), requestController.getAll)
  .post(validate({ body: createRequestSchema }), requestController.create);

router.route('/:id')
  .get(validate({ params: requestIdParamSchema }), requestController.getById)
  .patch(
    validate({ params: requestIdParamSchema, body: updateRequestSchema }),
    requestController.update
  )
  .delete(validate({ params: requestIdParamSchema }), requestController.delete);

router.patch(
  '/:id/status',
  validate({ params: requestIdParamSchema, body: updateRequestStatusSchema }),
  requestController.updateStatus
);

export default router;
