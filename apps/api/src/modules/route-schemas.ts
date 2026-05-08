import { z } from 'zod';

export const idParamsSchema = z.object({
  id: z.string().trim().min(1),
});

export const keyParamsSchema = z.object({
  key: z.string().trim().min(1),
});

export const settingValueBodySchema = z.object({
  value: z.string().trim(),
});

export const menuListQuerySchema = z.object({
  includeInactive: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
});
