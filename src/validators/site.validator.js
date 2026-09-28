import { z } from 'zod';

export const siteIdParamSchema = z.object({
  id: z.string().uuid('Идентификатор площадки должен быть валидным UUID'),
});
