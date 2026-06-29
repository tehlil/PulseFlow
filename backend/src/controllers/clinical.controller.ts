import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { createAssessmentSchema, updateAssessmentSchema, createVisitSchema } from '../validators/clinical.validator';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import { logger } from '../utils/logger';
import { eventBus } from '../events/eventBus';
import { DomainEvents } from '../events/eventTypes';

// -------------------------------------------------------------
// 1. CLINICAL ASSESSMENTS
// -------------------------------------------------------------

export async function createAssessment(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user!;
    const validated = createAssessmentSchema.parse(req.body);

    // Verify patient existence and tenant isolation
    const patient = await prisma.patient.findFirst({
      where: { id: validated.patientId, deletedAt: null },
    });

    if (!patient) {
      throw new NotFoundError('Patient not found');
    }

    if (user.role !== 'SUPER_ADMIN' && patient.hospitalId !== user.hospitalId) {
      throw new NotFoundError('Patient not found');
    }

    let calculatedBmi = validated.bmi;
    if (validated.weight && validated.height) {
      const heightInMeters = validated.height / 100;
      calculatedBmi = parseFloat((validated.weight / (heightInMeters * heightInMeters)).toFixed(2));
    }

    const assessment = await prisma.assessment.create({
      data: {
        patientId: validated.patientId,
        recorderId: user.userId,
        date: validated.date || new Date(),
        heartRate: validated.heartRate,
        bloodPressureSystolic: validated.bloodPressureSystolic,
        bloodPressureDiastolic: validated.bloodPressureDiastolic,
        bloodSugar: validated.bloodSugar,
        oxygenSaturation: validated.oxygenSaturation,
        temperature: validated.temperature,
        weight: validated.weight,
        height: validated.height,
        bmi: calculatedBmi,
        status: validated.status,
        symptoms: validated.symptoms,
        labValues: validated.labValues,
        notes: validated.notes,
      },
    });

    // Write audit log
    await prisma.auditLog.create({
      data: {
        action: 'ASSESSMENT_CREATE',
        resource: 'ASSESSMENT',
        resourceId: assessment.id,
        userId: user.userId,
        hospitalId: patient.hospitalId,
        metadata: { patientId: patient.id, mrn: patient.mrn, status: assessment.status },
      },
    });

    logger.info(`Clinical assessment logged for patient ${patient.firstName} ${patient.lastName} (ID: ${assessment.id})`);

    // Dispatch domain event (triggers background prediction generation asynchronously)
    eventBus.publish(DomainEvents.ASSESSMENT_CREATED, {
      assessmentId: assessment.id,
      patientId: patient.id,
      hospitalId: patient.hospitalId,
    });

    return res.status(201).json({
      status: 'success',
      data: { assessment },
    });
  } catch (error) {
    next(error);
  }
}

export async function getAssessmentById(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user!;
    const { id } = req.params;

    const assessment = await prisma.assessment.findFirst({
      where: { id, deletedAt: null },
      include: {
        patient: true,
        recorder: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });

    if (!assessment) {
      throw new NotFoundError('Assessment not found');
    }

    // Tenant check
    if (user.role !== 'SUPER_ADMIN' && assessment.patient.hospitalId !== user.hospitalId) {
      throw new NotFoundError('Assessment not found');
    }

    return res.status(200).json({
      status: 'success',
      data: { assessment },
    });
  } catch (error) {
    next(error);
  }
}

export async function updateAssessment(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user!;
    const { id } = req.params;
    const validated = updateAssessmentSchema.parse(req.body);

    const existing = await prisma.assessment.findFirst({
      where: { id, deletedAt: null },
      include: { patient: true },
    });

    if (!existing) {
      throw new NotFoundError('Assessment not found');
    }

    if (user.role !== 'SUPER_ADMIN' && existing.patient.hospitalId !== user.hospitalId) {
      throw new NotFoundError('Assessment not found');
    }

    const weightVal = validated.weight !== undefined ? validated.weight : existing.weight;
    const heightVal = validated.height !== undefined ? validated.height : existing.height;
    let finalBmi = existing.bmi;
    if (validated.bmi !== undefined) {
      finalBmi = validated.bmi;
    }
    if (weightVal && heightVal) {
      if (validated.weight !== undefined || validated.height !== undefined) {
        const heightInMeters = heightVal / 100;
        finalBmi = parseFloat((weightVal / (heightInMeters * heightInMeters)).toFixed(2));
      }
    } else if (weightVal === null || heightVal === null) {
      finalBmi = null;
    }

    const updated = await prisma.assessment.update({
      where: { id },
      data: {
        date: validated.date !== undefined ? (validated.date || new Date()) : undefined,
        heartRate: validated.heartRate !== undefined ? validated.heartRate : undefined,
        bloodPressureSystolic: validated.bloodPressureSystolic !== undefined ? validated.bloodPressureSystolic : undefined,
        bloodPressureDiastolic: validated.bloodPressureDiastolic !== undefined ? validated.bloodPressureDiastolic : undefined,
        bloodSugar: validated.bloodSugar !== undefined ? validated.bloodSugar : undefined,
        oxygenSaturation: validated.oxygenSaturation !== undefined ? validated.oxygenSaturation : undefined,
        temperature: validated.temperature !== undefined ? validated.temperature : undefined,
        weight: validated.weight !== undefined ? validated.weight : undefined,
        height: validated.height !== undefined ? validated.height : undefined,
        bmi: finalBmi,
        status: validated.status !== undefined ? validated.status : undefined,
        symptoms: validated.symptoms !== undefined ? validated.symptoms : undefined,
        labValues: validated.labValues !== undefined ? validated.labValues : undefined,
        notes: validated.notes !== undefined ? validated.notes : undefined,
      },
    });

    // Write audit log
    await prisma.auditLog.create({
      data: {
        action: 'ASSESSMENT_UPDATE',
        resource: 'ASSESSMENT',
        resourceId: id,
        userId: user.userId,
        hospitalId: existing.patient.hospitalId,
        metadata: { patientId: existing.patientId, changes: validated },
      },
    });

    logger.info(`Clinical assessment updated for patient ${existing.patient.firstName} ${existing.patient.lastName} (ID: ${id})`);

    // Publish event
    eventBus.publish(DomainEvents.ASSESSMENT_UPDATED, {
      assessmentId: id,
      patientId: existing.patientId,
      hospitalId: existing.patient.hospitalId,
    });

    return res.status(200).json({
      status: 'success',
      data: { assessment: updated },
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteAssessment(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user!;
    const { id } = req.params;

    const existing = await prisma.assessment.findFirst({
      where: { id, deletedAt: null },
      include: { patient: true },
    });

    if (!existing) {
      throw new NotFoundError('Assessment not found');
    }

    if (user.role !== 'SUPER_ADMIN' && existing.patient.hospitalId !== user.hospitalId) {
      throw new NotFoundError('Assessment not found');
    }

    // Soft delete
    await prisma.assessment.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    // Write audit log
    await prisma.auditLog.create({
      data: {
        action: 'ASSESSMENT_DELETE',
        resource: 'ASSESSMENT',
        resourceId: id,
        userId: user.userId,
        hospitalId: existing.patient.hospitalId,
        metadata: { patientId: existing.patientId },
      },
    });

    logger.info(`Clinical assessment soft deleted (ID: ${id})`);

    // Publish event
    eventBus.publish(DomainEvents.ASSESSMENT_DELETED, {
      assessmentId: id,
      patientId: existing.patientId,
      hospitalId: existing.patient.hospitalId,
    });

    return res.status(200).json({
      status: 'success',
      message: 'Assessment deleted successfully',
    });
  } catch (error) {
    next(error);
  }
}

export async function getPatientAssessments(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user!;
    const { patientId } = req.params;

    // Verify patient & isolation
    const patient = await prisma.patient.findFirst({
      where: { id: patientId, deletedAt: null },
    });

    if (!patient) {
      throw new NotFoundError('Patient not found');
    }

    if (user.role !== 'SUPER_ADMIN' && patient.hospitalId !== user.hospitalId) {
      throw new NotFoundError('Patient not found');
    }

    const assessments = await prisma.assessment.findMany({
      where: { patientId, deletedAt: null },
      orderBy: { date: 'desc' },
      include: {
        recorder: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });

    return res.status(200).json({
      status: 'success',
      data: { assessments },
    });
  } catch (error) {
    next(error);
  }
}

// -------------------------------------------------------------
// 2. PATIENT VISITS
// -------------------------------------------------------------

export async function createVisit(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user!;
    const validated = createVisitSchema.parse(req.body);

    // Verify patient & isolation
    const patient = await prisma.patient.findFirst({
      where: { id: validated.patientId, deletedAt: null },
    });

    if (!patient) {
      throw new NotFoundError('Patient not found');
    }

    if (user.role !== 'SUPER_ADMIN' && patient.hospitalId !== user.hospitalId) {
      throw new NotFoundError('Patient not found');
    }

    const visit = await prisma.visit.create({
      data: {
        patientId: validated.patientId,
        doctorId: user.userId, // Logs the user executing the consultation logs
        visitDate: validated.visitDate,
        reason: validated.reason,
        notes: validated.notes,
        status: validated.status,
      },
    });

    // Write audit log
    await prisma.auditLog.create({
      data: {
        action: 'VISIT_CREATE',
        resource: 'VISIT',
        resourceId: visit.id,
        userId: user.userId,
        hospitalId: patient.hospitalId,
        metadata: { patientId: patient.id, reason: visit.reason },
      },
    });

    logger.info(`Consultation visit logged for patient ${patient.firstName} ${patient.lastName} (ID: ${visit.id})`);

    return res.status(201).json({
      status: 'success',
      data: { visit },
    });
  } catch (error) {
    next(error);
  }
}

export async function getPatientVisits(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user!;
    const { patientId } = req.params;

    // Verify patient & isolation
    const patient = await prisma.patient.findFirst({
      where: { id: patientId, deletedAt: null },
    });

    if (!patient) {
      throw new NotFoundError('Patient not found');
    }

    if (user.role !== 'SUPER_ADMIN' && patient.hospitalId !== user.hospitalId) {
      throw new NotFoundError('Patient not found');
    }

    const visits = await prisma.visit.findMany({
      where: { patientId, deletedAt: null },
      orderBy: { visitDate: 'desc' },
      include: {
        doctor: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });

    return res.status(200).json({
      status: 'success',
      data: { visits },
    });
  } catch (error) {
    next(error);
  }
}
