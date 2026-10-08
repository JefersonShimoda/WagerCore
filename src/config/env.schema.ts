import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  PORT: z.coerce.number().int().positive(),

  DATABASE_HOST: z.string().min(1),
  DATABASE_PORT: z.coerce.number().int().positive(),
  DATABASE_NAME: z.string().min(1),
  DATABASE_USER: z.string().min(1),
  DATABASE_PASSWORD: z.string().min(1),

  AWS_REGION: z.string().min(1),
  AWS_ENDPOINT_URL: z.url(),
  AWS_ACCESS_KEY_ID: z.string().min(1),
  AWS_SECRET_ACCESS_KEY: z.string().min(1),

  SQS_TRANSACTIONS_QUEUE: z.string().min(1),
  SQS_TRANSACTIONS_DLQ: z.string().min(1),
  SQS_EVENTS_QUEUE: z.string().min(1),
});
