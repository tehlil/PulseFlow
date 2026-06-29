import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { addPredictionJob } from '../queues/queueManager';
import { NotFoundError, BadRequestError } from '../utils/errors';
import { logger } from '../utils/logger';

export async function generatePredictionTrigger(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user!;
    const { assessmentId } = req.body;

    if (!assessmentId) {
      throw new BadRequestError('Assessment ID is required');
    }

    // Verify assessment exists and hospital matches
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId, deletedAt: null },
      include: { patient: true },
    });

    if (!assessment) {
      throw new NotFoundError('Assessment not found');
    }

    if (user.role !== 'SUPER_ADMIN' && assessment.patient.hospitalId !== user.hospitalId) {
      throw new NotFoundError('Assessment not found');
    }

    // Dispatch queue job
    const job = await addPredictionJob(assessmentId);

    // Audit log
    await prisma.auditLog.create({
      data: {
        action: 'PREDICTION_QUEUE_TRIGGER',
        resource: 'PREDICTION',
        userId: user.userId,
        hospitalId: assessment.patient.hospitalId,
        metadata: { assessmentId, jobId: job.id },
      },
    });

    logger.info(`Manually triggered prediction generation for Assessment ID: ${assessmentId} (Job: ${job.id})`);

    return res.status(202).json({
      status: 'accepted',
      message: 'Prediction generation task has been queued',
      data: { jobId: job.id },
    });
  } catch (error) {
    next(error);
  }
}

export async function getPredictionById(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user!;
    const { id } = req.params;

    const prediction = await prisma.prediction.findFirst({
      where: { id, deletedAt: null },
      include: {
        patient: true,
        assessment: true,
      },
    });

    if (!prediction) {
      throw new NotFoundError('Prediction not found');
    }

    // Tenant check
    if (user.role !== 'SUPER_ADMIN' && prediction.patient.hospitalId !== user.hospitalId) {
      throw new NotFoundError('Prediction not found');
    }

    return res.status(200).json({
      status: 'success',
      data: { prediction },
    });
  } catch (error) {
    next(error);
  }
}
