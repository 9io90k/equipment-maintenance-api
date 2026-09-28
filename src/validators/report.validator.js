import { z } from 'zod';

export const equipmentLoadReportQuerySchema = z.object({
  startDate: z
    .string()
    .refine((val) => !Number.isNaN(new Date(val).getTime()), {
      message: 'startDate должна быть корректной датой ISO',
    })
    .optional(),
  endDate: z
    .string()
    .refine((val) => !Number.isNaN(new Date(val).getTime()), {
      message: 'endDate должна быть корректной датой ISO',
    })
    .optional(),
  siteId: z.string().uuid('siteId должен быть валидным UUID').optional(),
  minRequests: z.coerce.number().int().min(0, 'minRequests не может быть отрицательным').optional(),
});

export const maintenanceReportQuerySchema = equipmentLoadReportQuerySchema;
