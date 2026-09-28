import { Router } from 'express';
import { requestController } from '../controllers/request.controller.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  createRequestSchema,
  updateRequestSchema,
  updateRequestStatusSchema,
  requestIdParamSchema,
  removeAssigneeParamSchema,
  queryRequestSchema,
  assignBrigadeSchema,
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

router.get(
  '/:id/history',
  validate({ params: requestIdParamSchema }),
  requestController.getStatusHistory
);

router.post(
  '/:id/assignees',
  validate({ params: requestIdParamSchema, body: assignBrigadeSchema }),
  requestController.setAssignees
);

router.delete(
  '/:id/assignees/:technicianId',
  validate({ params: removeAssigneeParamSchema }),
  requestController.removeAssignee
);

export default router;
