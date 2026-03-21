import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DB_PATH: z.string().default('./data/gridfinity.db'),
  IMAGE_DIR: z.string().default('./data/images'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  JWT_SECRET: z.string().default('dev-jwt-secret-change-in-production'),
  JWT_REFRESH_SECRET: z.string().default('dev-refresh-secret-change-in-production'),
  USER_STL_DIR: z.string().default('./data/user-stls'),
  USER_STL_IMAGE_DIR: z.string().default('./data/user-stl-images'),
  MAX_STL_WORKERS: z.coerce.number().default(2),
  PYTHON_SCRIPT_DIR: z.string().default('./scripts/py'),
});

export type Config = z.infer<typeof envSchema>;
export const config = envSchema.parse(process.env);
