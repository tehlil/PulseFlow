import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';

export async function getHospitals(req: Request, res: Response, next: NextFunction) {
  try {
    const hospitals = await prisma.hospital.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' },
    });
    return res.status(200).json({
      status: 'success',
      data: { hospitals },
    });
  } catch (error) {
    next(error);
  }
}
