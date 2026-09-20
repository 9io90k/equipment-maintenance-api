import { z } from 'zod';

const requestPriorities = ['low', 'medium', 'high', 'critical'];
const requestStatuses = ['new', 'in_progress', 'done', 'rejected'];

const isoDateTime = z.string().refine(
    (val) => !Number.isNaN(new Date(val).getTime()),
    { message: 'Некорректный формат ISO даты' }
);

export const createRequestSchema = z.object({
    equipmentId: z.string().uuid('equipmentId должен быть валидным UUID'),
    title: z.string().trim().min(5).max(120, 'Заголовок должен быть от 5 до 120 символов'),
    description: z.string().trim().max(2000, 'Описание должно быть до 2000 символов').optional(),
    priority: z.enum(requestPriorities, {
        errorMap: () => ({ message: `Приоритет должен быть одним из: ${requestPriorities.join(',')}` }),
    }),
    status: z.enum(requestStatuses).default('new'),
    plannedAt: isoDateTime.optional(),
});

export const updateRequestSchema = z.object({
    title: z.string().trim().min(5).max(120).optional(),
    description: z.string().trim().max(2000).optional(),
    priority: z.enum(requestPriorities).optional(),
    plannedAt: isoDateTime.optional(),
});

export const requestIdParamSchema = z.object({
    id: z.string().uuid('Идентификатор заявки должен быть валидным UUID'),
});

export const queryRequestSchema = z.object({
    status: z.enum(requestStatuses).optional(),
    equipmentId: z.string().uuid('Идентификатор оборудования должен быть валидным UUID').optional(),
    priority: z.enum(requestPriorities).optional(),
    createdFrom: z.string().refine((val) => !Number.isNaN(new Date(val).getTime()), {
        message: 'createdFrom должна быть корректной ISO датой',
    }).optional(),
    createdTo: z.string().refine((val) => !Number.isNaN(new Date(val).getTime()), {
        message: 'createdTo должна быть корректной ISO датой',
    }).optional(),
    plannedFrom: z.string().refine((val) => !Number.isNaN(new Date(val).getTime()), {
        message: 'plannedFrom должна быть корректной ISO датой',
    }).optional(),
    plannedTo: z.string().refine((val) => !Number.isNaN(new Date(val).getTime()), {
        message: 'plannedTo должна быть корректной ISO датой',
    }).optional(),
    sortBy: z.enum(['title', 'plannedAt', 'createdAt']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
});

export const updateRequestStatusSchema = z.object({
    status: z.enum(requestStatuses),
});