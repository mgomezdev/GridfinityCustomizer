import express from 'express';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { logger } from './logger.js';
import { requestIdMiddleware } from './middleware/requestId.js';
import { corsMiddleware } from './middleware/cors.js';
import { errorHandler } from './middleware/errorHandler.js';
import healthRoutes from './routes/health.routes.js';
import authRoutes from './routes/auth.routes.js';
import librariesRoutes from './routes/libraries.routes.js';
import categoriesRoutes from './routes/categories.routes.js';
import imagesRoutes from './routes/images.routes.js';

export function createApp(): express.Express {
  const app = express();

  // Security headers
  app.use(helmet());

  // Body parsing
  app.use(express.json({ limit: '1mb' }));

  // Request ID
  app.use(requestIdMiddleware);

  // CORS
  app.use(corsMiddleware);

  // Request logging
  app.use(
    pinoHttp({
      logger,
      autoLogging: {
        ignore: (req) => req.url === '/api/v1/health',
      },
    }),
  );

  // Routes
  app.use('/api/v1', healthRoutes);
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/libraries', librariesRoutes);
  app.use('/api/v1/categories', categoriesRoutes);
  app.use('/api/v1/images', imagesRoutes);

  // Global error handler (must be last)
  app.use(errorHandler);

  return app;
}
