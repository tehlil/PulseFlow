import { eventBus } from '../events/eventBus';
import { DomainEvents, AssessmentCreatedPayload, AssessmentUpdatedPayload, AssessmentDeletedPayload, CriticalRiskDetectedPayload } from '../events/eventTypes';
import { addPredictionJob, addNotificationJob } from '../queues/queueManager';
import { prisma } from '../config/db';
import { logger } from '../utils/logger';

export function initClinicalSubscribers() {
  // 1. AssessmentCreated -> Trigger background Prediction generation
  eventBus.subscribe(DomainEvents.ASSESSMENT_CREATED, async (payload: AssessmentCreatedPayload) => {
    logger.info(`📥 Event Received: ASSESSMENT_CREATED. Queuing prediction generation for Assessment ID: ${payload.assessmentId}`);
    await addPredictionJob(payload.assessmentId);
  });

  // 2. AssessmentUpdated -> Trigger background Prediction recalculation
  eventBus.subscribe(DomainEvents.ASSESSMENT_UPDATED, async (payload: AssessmentUpdatedPayload) => {
    logger.info(`📥 Event Received: ASSESSMENT_UPDATED. Queuing prediction recalculation for Assessment ID: ${payload.assessmentId}`);
    await addPredictionJob(payload.assessmentId);
  });

  // 3. AssessmentDeleted -> Invalidate predictions
  eventBus.subscribe(DomainEvents.ASSESSMENT_DELETED, async (payload: AssessmentDeletedPayload) => {
    logger.info(`📥 Event Received: ASSESSMENT_DELETED. Invalidating predictions for Assessment ID: ${payload.assessmentId}`);
    await prisma.prediction.updateMany({
      where: { assessmentId: payload.assessmentId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  });

  // 4. CriticalRiskDetected -> Notify Clinical staff
  eventBus.subscribe(DomainEvents.CRITICAL_RISK_DETECTED, async (payload: CriticalRiskDetectedPayload) => {
    logger.warn(`🚨 Event Received: CRITICAL_RISK_DETECTED. Patient ID: ${payload.patientId} has ${payload.riskCategory} risk (${payload.riskScore}%)`);

    // Fetch patient info
    const patient = await prisma.patient.findUnique({
      where: { id: payload.patientId },
    });
    
    if (!patient) return;

    // Fetch doctors, nurses, and admins in the same hospital to dispatch alerts
    const staff = await prisma.user.findMany({
      where: {
        hospitalId: payload.hospitalId,
        role: {
          name: { in: ['DOCTOR', 'NURSE', 'HOSPITAL_ADMIN'] },
        },
        status: 'ACTIVE',
        deletedAt: null,
      },
    });

    logger.info(`Sending alert notifications to ${staff.length} staff members at hospital ID: ${payload.hospitalId}`);

    for (const member of staff) {
      const alertTitle = `⚠️ Critical Patient Risk Alert - MRN: ${patient.mrn}`;
      const alertMsg = `Patient ${patient.firstName} ${patient.lastName} exhibits a ${payload.riskCategory} risk score (${payload.riskScore}%) of clinical deterioration. Review detail chart immediately.`;
      
      await addNotificationJob(
        member.id,
        alertTitle,
        alertMsg,
        'CRITICAL_RISK'
      );
    }
  });

  logger.info('🔌 Clinical Event Subscribers registered successfully');
}
export default initClinicalSubscribers;
