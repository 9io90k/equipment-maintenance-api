import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().trim().email('Некорректный формат email').max(150, 'Email не должен превышать 150 символов'),
  password: z.string().min(8, 'Пароль должен содержать минимум 8 символов').max(128, 'Пароль не должен превышать 128 символов'),
  role: z.enum(['viewer', 'technician', 'admin'], {
    errorMap: () => ({ message: 'Роль должна быть viewer, technician или admin' }),
  }).optional().default('viewer'),
  technicianId: z.string().uuid('technicianId должен быть валидным UUID').optional().nullable(),
});

export const loginSchema = z.object({
  email: z.string().trim().email('Некорректный формат email'),
  password: z.string().min(1, 'Пароль обязателен'),
});
