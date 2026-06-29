import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { createPatientSchema, updatePatientSchema } from '../validators/patient.validator';
import { ConflictError, NotFoundError, ForbiddenError } from '../utils/errors';
import { logger } from '../utils/logger';

export async function createPatient(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user!;
    
    // Multi-tenant check: Non-SUPER_ADMIN users must have a hospital ID assigned
    if (!user.hospitalId && user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenError('Staff member must be assigned to a hospital to register patients');
    }

    const validated = createPatientSchema.parse(req.body);
    const targetHospitalId = user.role === 'SUPER_ADMIN' ? (req.body.hospitalId || user.hospitalId) : user.hospitalId;

    if (!targetHospitalId) {
      throw new ForbiddenError('Hospital ID is required to register a patient');
    }

    // Check duplicate MRN in the same hospital
    const existingPatient = await prisma.patient.findFirst({
      where: {
        hospitalId: targetHospitalId,
        mrn: validated.mrn,
        deletedAt: null,
      },
    });

    if (existingPatient) {
      throw new ConflictError('A patient with this MRN is already registered in this hospital');
    }

    const patient = await prisma.patient.create({
      data: {
        ...validated,
        hospitalId: targetHospitalId,
      },
    });

    // Write audit log
    await prisma.auditLog.create({
      data: {
        action: 'PATIENT_CREATE',
        resource: 'PATIENT',
        resourceId: patient.id,
        userId: user.userId,
        hospitalId: targetHospitalId,
        metadata: { mrn: patient.mrn, name: `${patient.firstName} ${patient.lastName}` },
      },
    });

    logger.info(`Patient registered: ${patient.firstName} ${patient.lastName} (MRN: ${patient.mrn})`);

    return res.status(201).json({
      status: 'success',
      data: { patient },
    });
  } catch (error) {
    next(error);
  }
}

export async function getPatients(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user!;
    const { search, status, page = '1', limit = '10' } = req.query;
    
    const parsedPage = parseInt(page as string, 10);
    const parsedLimit = parseInt(limit as string, 10);
    const skip = (parsedPage - 1) * parsedLimit;

    // Scope check: force isolation by user's hospitalId unless SUPER_ADMIN
    const hospitalFilter = user.role === 'SUPER_ADMIN' 
      ? (req.query.hospitalId ? { hospitalId: req.query.hospitalId as string } : {}) 
      : { hospitalId: user.hospitalId! };

    // Search query mappings
    const searchQuery = search
      ? {
          OR: [
            { firstName: { contains: search as string, mode: 'insensitive' as const } },
            { lastName: { contains: search as string, mode: 'insensitive' as const } },
            { mrn: { contains: search as string, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const statusQuery = status ? { status: status as string } : {};

    const whereClause = {
      ...hospitalFilter,
      ...searchQuery,
      ...statusQuery,
      deletedAt: null,
    };

    const [patients, totalItems] = await prisma.$transaction([
      prisma.patient.findMany({
        where: whereClause,
        skip,
        take: parsedLimit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.patient.count({ where: whereClause }),
    ]);

    return res.status(200).json({
      status: 'success',
      data: {
        patients,
        pagination: {
          totalItems,
          totalPages: Math.ceil(totalItems / parsedLimit),
          currentPage: parsedPage,
          limit: parsedLimit,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getPatientById(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user!;
    const { id } = req.params;

    const patient = await prisma.patient.findFirst({
      where: { id, deletedAt: null },
      include: {
        medicalHistory: { where: { deletedAt: null }, orderBy: { recordedAt: 'desc' } },
        visits: { where: { deletedAt: null }, orderBy: { visitDate: 'desc' } },
        assessments: { where: { deletedAt: null }, orderBy: { date: 'desc' } },
        predictions: { where: { deletedAt: null }, orderBy: { createdAt: 'desc' } },
        documents: { where: { deletedAt: null }, orderBy: { createdAt: 'desc' } },
      },
    });

    if (!patient) {
      throw new NotFoundError('Patient not found');
    }

    // Isolation security validation
    if (user.role !== 'SUPER_ADMIN' && patient.hospitalId !== user.hospitalId) {
      throw new NotFoundError('Patient not found'); // Obfuscate access breach
    }

    return res.status(200).json({
      status: 'success',
      data: { patient },
    });
  } catch (error) {
    next(error);
  }
}

export async function updatePatient(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user!;
    const { id } = req.params;

    const patient = await prisma.patient.findFirst({
      where: { id, deletedAt: null },
    });

    if (!patient) {
      throw new NotFoundError('Patient not found');
    }

    // Isolation check
    if (user.role !== 'SUPER_ADMIN' && patient.hospitalId !== user.hospitalId) {
      throw new NotFoundError('Patient not found');
    }

    const validated = updatePatientSchema.parse(req.body);

    const updatedPatient = await prisma.patient.update({
      where: { id },
      data: validated,
    });

    // Write audit log
    await prisma.auditLog.create({
      data: {
        action: 'PATIENT_UPDATE',
        resource: 'PATIENT',
        resourceId: id,
        userId: user.userId,
        hospitalId: patient.hospitalId,
        metadata: { changes: validated },
      },
    });

    logger.info(`Patient updated: ${updatedPatient.firstName} ${updatedPatient.lastName} (ID: ${id})`);

    return res.status(200).json({
      status: 'success',
      data: { patient: updatedPatient },
    });
  } catch (error) {
    next(error);
  }
}

export async function deletePatient(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user!;
    const { id } = req.params;

    const patient = await prisma.patient.findFirst({
      where: { id, deletedAt: null },
    });

    if (!patient) {
      throw new NotFoundError('Patient not found');
    }

    // Isolation check
    if (user.role !== 'SUPER_ADMIN' && patient.hospitalId !== user.hospitalId) {
      throw new NotFoundError('Patient not found');
    }

    // Soft delete
    await prisma.patient.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    // Write audit log
    await prisma.auditLog.create({
      data: {
        action: 'PATIENT_DELETE',
        resource: 'PATIENT',
        resourceId: id,
        userId: user.userId,
        hospitalId: patient.hospitalId,
      },
    });

    logger.info(`Patient soft deleted: MRN ${patient.mrn} (ID: ${id})`);

    return res.status(200).json({
      status: 'success',
      message: 'Patient record deleted successfully',
    });
  } catch (error) {
    next(error);
  }
}
