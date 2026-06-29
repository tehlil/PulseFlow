import { Queue } from 'bullmq';
import { redisConnection } from '../config/redis';
import { logger } from '../utils/logger';

// 1. Queue Definitions
export const predictionQueue = new Queue('prediction-queue', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: true,
  },
});

export const notificationQueue = new Queue('notification-queue', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'fixed',
      delay: 2000,
    },
    removeOnComplete: true,
  },
});

export const analyticsQueue = new Queue('analytics-queue', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: true,
  },
});

export const auditQueue = new Queue('audit-queue', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 2,
    removeOnComplete: true,
  },
});

// Log errors
predictionQueue.on('error', (err) => logger.error('prediction-queue error:', err));
notificationQueue.on('error', (err) => logger.error('notification-queue error:', err));

// 2. Dispatch Helpers
export async function addPredictionJob(assessmentId: string) {
  try {
    const job = await predictionQueue.add('generate-prediction', { assessmentId });
    logger.info(`✅ Prediction job added: Job ID ${job.id} for Assessment ${assessmentId}`);
    return job;
  } catch (error) {
    logger.error(`❌ Failed to add prediction job for assessment ${assessmentId}:`, error);
    throw error;
  }
}

export async function addNotificationJob(userId: string, title: string, message: string, type: string) {
  try {
    const job = await notificationQueue.add('dispatch-notification', { userId, title, message, type });
    logger.info(`✅ Notification job added: Job ID ${job.id} for User ${userId}`);
    return job;
  } catch (error) {
    logger.error(`❌ Failed to add notification job:`, error);
    throw error;
  }
}

export async function addAnalyticsJob(hospitalId: string) {
  try {
    const job = await analyticsQueue.add('aggregate-analytics', { hospitalId });
    return job;
  } catch (error) {
    logger.error('Failed to add analytics job:', error);
  }
}

export async function addAuditExportJob(userId: string, hospitalId: string | null) {
  try {
    const job = await auditQueue.add('export-audits', { userId, hospitalId });
    return job;
  } catch (error) {
    logger.error('Failed to add audit export job:', error);
    throw error;
  }
}
