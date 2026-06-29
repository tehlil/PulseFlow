import { Worker, Job } from 'bullmq';
import { redisConnection } from '../config/redis';
import { prisma } from '../config/db';
import { PredictionService } from '../services/prediction.service';
import { logger } from '../utils/logger';

// -------------------------------------------------------------
// 1. PREDICTION GENERATION WORKER
// -------------------------------------------------------------
export const predictionWorker = new Worker(
  'prediction-queue',
  async (job: Job) => {
    logger.info(`👷 Worker starting job ${job.id}: ${job.name}`);
    const { assessmentId } = job.data;
    
    if (!assessmentId) {
      throw new Error('Missing assessmentId in prediction job payload');
    }

    await PredictionService.generateAndSave(assessmentId);
  },
  {
    connection: redisConnection,
    concurrency: 2, // Process up to 2 prediction jobs concurrently
  }
);

predictionWorker.on('completed', (job) => {
  logger.info(`✨ Job ${job.id} completed successfully in predictionWorker`);
});

predictionWorker.on('failed', (job, err) => {
  logger.error(`❌ Job ${job?.id} failed in predictionWorker with error: ${err.message}`, err);
});

// -------------------------------------------------------------
// 2. NOTIFICATION DISPATCH WORKER
// -------------------------------------------------------------
export const notificationWorker = new Worker(
  'notification-queue',
  async (job: Job) => {
    logger.info(`👷 Worker starting job ${job.id}: ${job.name}`);
    const { userId, title, message, type } = job.data;

    // A. Persist notification in database
    const notification = await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type,
      },
      include: {
        user: true,
      },
    });

    // B. Mock Email Dispatch
    logger.info(`📧 [MOCK EMAIL DISPATCH] Sent alert to user [${notification.user.email}]: "${title}" - ${message}`);
  },
  { connection: redisConnection }
);

notificationWorker.on('completed', (job) => {
  logger.info(`✨ Job ${job.id} completed successfully in notificationWorker`);
});

notificationWorker.on('failed', (job, err) => {
  logger.error(`❌ Job ${job?.id} failed in notificationWorker: ${err.message}`);
});

// -------------------------------------------------------------
// 3. ANALYTICS AGGREGATION WORKER
// -------------------------------------------------------------
export const analyticsWorker = new Worker(
  'analytics-queue',
  async (job: Job) => {
    logger.info(`👷 Worker starting job ${job.id}: ${job.name}`);
    const { hospitalId } = job.data;

    // Simulate database calculation of patient counts and risk distributions
    const patientCount = await prisma.patient.count({
      where: { hospitalId, deletedAt: null },
    });

    logger.info(`📊 [ANALYTICS AGGREGATION] Completed metrics update for Hospital ID: ${hospitalId}. Scanned ${patientCount} active patient charts.`);
  },
  { connection: redisConnection }
);

// -------------------------------------------------------------
// 4. AUDIT EXPORT WORKER
// -------------------------------------------------------------
export const auditWorker = new Worker(
  'audit-queue',
  async (job: Job) => {
    logger.info(`👷 Worker starting job ${job.id}: ${job.name}`);
    const { userId, hospitalId } = job.data;

    // Simulate exporting audit records to a CSV file
    const logsCount = await prisma.auditLog.count({
      where: { hospitalId },
    });

    logger.info(`📁 [AUDIT LOGS EXPORT] Compiled export batch of ${logsCount} rows. Job requested by User ID: ${userId}`);
  },
  { connection: redisConnection }
);

export function startWorkers() {
  logger.info('⚙️ Background workers initialized and listening to Redis queues');
}
export default startWorkers;
