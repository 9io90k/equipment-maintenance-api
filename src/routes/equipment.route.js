import { Router } from 'express';
import { equipmentController } from '../controllers/equipment.controller.js';
import { requestController } from '../controllers/request.controller.js';
import { validate } from '../middlewares/validate.middleware.js';
import { authenticate, requireRole } from '../middlewares/auth.middleware.js';
import {
  createEquipmentSchema,
  updateEquipmentSchema,
  equipmentIdParamSchema,
  queryEquipmentSchema,
} from '../validators/equipment.validator.js';

const router = Router();

router.use(authenticate);

router.route('/')
  .get(validate({ query: queryEquipmentSchema }), equipmentController.getAll)
  .post(requireRole('admin'), validate({ body: createEquipmentSchema }), equipmentController.create);

router.route('/:id')
  .get(validate({ params: equipmentIdParamSchema }), equipmentController.getById)
  .patch(
    requireRole('admin'),
    validate({ params: equipmentIdParamSchema, body: updateEquipmentSchema }),
    equipmentController.update
  )
  .delete(requireRole('admin'), validate({ params: equipmentIdParamSchema }), equipmentController.delete);

router.get(
  '/:id/requests',
  validate({ params: equipmentIdParamSchema }),
  requestController.getByEquipmentId
);

router.get(
  '/:id/weather',
  validate({ params: equipmentIdParamSchema }),
  equipmentController.getWeather
);

export default router;
