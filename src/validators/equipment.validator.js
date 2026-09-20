import { z } from 'zod';

const equipmentTypes = ['turbine', 'inverter', 'sensor', 'substation'];
const equipmentStatuses = ['operational', 'maintenance', 'fault', 'decommissioned'];

const pastOrPresentIsoDate = z.string().refine(
  (val) => {
    const date = new Date(val);
    if (Number.isNaN(date.getTime())) return false;
    return date.getTime() <= Date.now();
  },
  { message: 'installedAt должна быть корректной датой и не может быть в будущем' }
);

export const createEquipmentSchema = z.object({
  name: z.string().trim().min(3, 'Название должно содержать минимум 3 символа').max(100, 'Название не должно превышать 100 символов'),
  type: z.enum(equipmentTypes, {
    errorMap: () => ({ message: `Недопустимый тип. Разрешены: ${equipmentTypes.join(', ')}` }),
  }),
  serialNumber: z.string().trim().min(1, 'Серийный номер обязателен'),
  location: z.object({
    lat: z.number().min(-90).max(90, 'Широта lat должна быть от -90 до 90'),
    lon: z.number().min(-180).max(180, 'Долгота lon должна быть от -180 до 180'),
  }),
  status: z.enum(equipmentStatuses, {
    errorMap: () => ({ message: `Недопустимый статус. Разрешены: ${equipmentStatuses.join(', ')}` }),
  }).default('operational'),
  installedAt: pastOrPresentIsoDate,
});

export const updateEquipmentSchema = z.object({
  name: z.string().trim().min(3).max(100).optional(),
  type: z.enum(equipmentTypes).optional(),
  serialNumber: z.string().trim().min(1).optional(),
  location: z.object({
    lat: z.number().min(-90).max(90),
    lon: z.number().min(-180).max(180),
  }).optional(),
  status: z.enum(equipmentStatuses).optional(),
  installedAt: pastOrPresentIsoDate.optional(),
});

export const equipmentIdParamSchema = z.object({
  id: z.string().uuid('Идентификатор оборудования должен быть валидным UUID'),
});

export const queryEquipmentSchema = z.object({
  status: z.enum(equipmentStatuses).optional(),
  type: z.enum(equipmentTypes).optional(),
  search: z.string().trim().optional(),
  installedFrom: z.string().refine((val) => !Number.isNaN(new Date(val).getTime()), {
    message: 'installedFrom должна быть корректной ISO датой',
  }).optional(),
  installedTo: z.string().refine((val) => !Number.isNaN(new Date(val).getTime()), {
    message: 'installedTo должна быть корректной ISO датой',
  }).optional(),
  sortBy: z.enum(['name', 'installedAt', 'createdAt', 'serialNumber']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});
