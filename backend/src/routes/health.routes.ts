import { Router, Request, Response } from 'express';
import { prisma } from '../config/db';
import { redisClient } from '../config/redis';
import { logger } from '../utils/logger';

const router = Router();

// GET /health
router.get('/', (req: Request, res: Response) => {
  res.json({
    status: 'UP',
    timestamp: new Date().toISOString(),
    service: 'clinic-predict-backend',
  });
});

// GET /health/database
router.get('/database', async (req: Request, res: Response) => {
  try {
    // Perform simple query to verify db connectivity
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'UP',
      timestamp: new Date().toISOString(),
      database: 'PostgreSQL',
      connection: 'CONNECTED',
    });
  } catch (error: any) {
    logger.error('Database health check failed:', error);
    res.status(500).json({
      status: 'DOWN',
      timestamp: new Date().toISOString(),
      database: 'PostgreSQL',
      error: error.message || 'Connection failure',
    });
  }
});

// GET /health/redis
router.get('/redis', async (req: Request, res: Response) => {
  try {
    const pingStatus = await redisClient.ping();
    if (pingStatus === 'PONG') {
      res.json({
        status: 'UP',
        timestamp: new Date().toISOString(),
        redis: 'Redis',
        connection: 'CONNECTED',
      });
    } else {
      throw new Error(`Unexpected Redis ping response: ${pingStatus}`);
    }
  } catch (error: any) {
    logger.error('Redis health check failed:', error);
    res.status(500).json({
      status: 'DOWN',
      timestamp: new Date().toISOString(),
      redis: 'Redis',
      error: error.message || 'Connection failure',
    });
  }
});

export const healthRoutes = router;
