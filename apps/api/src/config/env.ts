import { z } from 'zod';

import { adminEnvSchema } from '@te-pinta/shared';

export const nodeEnvSchema = z.enum(['development', 'test', 'production']);

export const apiEnvSchema = adminEnvSchema
  .extend({
    DATABASE_URL: z.string().url(),
    JWT_SECRET: z.string().min(32),
    JWT_REFRESH_SECRET: z.string().min(32),
    ALLOWED_ORIGIN: z.string().url(),
    PORT: z.coerce.number().int().positive().default(3000),
    NODE_ENV: nodeEnvSchema.default('development'),
  })
  .transform((env) => ({
    ...env,
    ADMIN_EMAIL: env.ADMIN_EMAIL.toLowerCase(),
  }));

export type ApiEnv = z.infer<typeof apiEnvSchema>;

export const parseEnv = (env: NodeJS.ProcessEnv | Record<string, unknown>): ApiEnv => {
  return apiEnvSchema.parse(env);
};

export const getEnv = (): ApiEnv => parseEnv(process.env);
