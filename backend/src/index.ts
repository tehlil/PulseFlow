import express, { Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import { connectDatabase, prisma } from './config/db';
import { connectRedis, redisClient } from './config/redis';
import { logger } from './utils/logger';
import { errorHandler } from './middlewares/errorHandler';
import { requestLogger } from './middlewares/requestLogger';
import { healthRoutes, apiRouter } from './routes';
import { startWorkers } from './workers';
import { initClinicalSubscribers } from './subscribers/clinical.subscriber';

const app: Express = express();

// Set security HTTP headers
app.use(helmet());

// Enable CORS with secure defaults
app.use(
  cors({
    origin: '*', // Customize this for production environments
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

// Cookie parsing middleware
app.use(cookieParser());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Global Request logging
app.use(requestLogger);

// Rate limiting: Limit requests from same IP to 100 requests per 15 minutes by default
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    status: 429,
    message: 'Too many requests from this IP, please try again after 15 minutes.',
  },
});
app.use('/api/', limiter);

// Mount health checks
app.use('/health', healthRoutes);

// Mount API versioned routes
app.use(`/api/${config.API_VERSION}`, apiRouter);

// Global Error Handling Middleware
app.use(errorHandler);

const PORT = config.PORT;

async function bootstrap() {
  try {
    // 1. Database Connection
    await connectDatabase();

    // 2. Redis Connection
    await connectRedis();

    // Start background queue workers
    startWorkers();

    // Initialize event subscribers
    initClinicalSubscribers();

    // 3. Start server listener
    const server = app.listen(PORT, () => {
      logger.info(`🚀 Clinical Prediction Engine Server listening on port ${PORT}`);
      logger.info(`🩺 Environment: ${config.NODE_ENV}`);
      logger.info(`📡 API Version Route: /api/${config.API_VERSION}`);
    });

    // Graceful Shutdown Handler
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Starting graceful shutdown...`);
      server.close(async () => {
        logger.info('HTTP server closed.');
        try {
          await prisma.$disconnect();
          logger.info('Database client disconnected.');
          await redisClient.quit();
          logger.info('Redis client disconnected.');
          process.exit(0);
        } catch (err) {
          logger.error('Error during database/redis cleanup on shutdown:', err);
          process.exit(1);
        }
      });

      // Force exit after 10s if graceful shutdown times out
      setTimeout(() => {
        logger.error('Forceful shutdown triggered after timeout.');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    logger.error('❌ Application bootstrap failed:', error);
    process.exit(1);
  }
}

bootstrap();
