import { Router } from 'express';
import { requestController } from '../controllers/request.controller.js';
import { validate } from '../middlewares/validate.middleware.js';
import { authenticate, requireRole } from '../middlewares/auth.middleware.js';
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

router.use(authenticate);

router.route('/')
  .get(validate({ query: queryRequestSchema }), requestController.getAll)
  .post(
    requireRole('technician', 'admin'),
    validate({ body: createRequestSchema }),
    requestController.create
  );

router.route('/:id')
  .get(validate({ params: requestIdParamSchema }), requestController.getById)
  .patch(
    requireRole('technician', 'admin'),
    validate({ params: requestIdParamSchema, body: updateRequestSchema }),
    requestController.update
  )
  .delete(requireRole('admin'), validate({ params: requestIdParamSchema }), requestController.delete);

router.patch(
  '/:id/status',
  requireRole('technician', 'admin'),
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
  requireRole('admin'),
  validate({ params: requestIdParamSchema, body: assignBrigadeSchema }),
  requestController.setAssignees
);

router.delete(
  '/:id/assignees/:technicianId',
  requireRole('admin'),
  validate({ params: removeAssigneeParamSchema }),
  requestController.removeAssignee
);

export default router;
