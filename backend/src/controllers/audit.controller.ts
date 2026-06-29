import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { ForbiddenError } from '../utils/errors';

export async function getAuditLogs(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user!;
    const { action, resource, userId, page = '1', limit = '20' } = req.query;

    const parsedPage = parseInt(page as string, 10);
    const parsedLimit = parseInt(limit as string, 10);
    const skip = (parsedPage - 1) * parsedLimit;

    // Scope check: Force isolation by user's hospitalId unless SUPER_ADMIN
    const hospitalFilter = user.role === 'SUPER_ADMIN'
      ? (req.query.hospitalId ? { hospitalId: req.query.hospitalId as string } : {})
      : { hospitalId: user.hospitalId! };

    const actionFilter = action ? { action: action as string } : {};
    const resourceFilter = resource ? { resource: resource as string } : {};
    const userFilter = userId ? { userId: userId as string } : {};

    const whereClause = {
      ...hospitalFilter,
      ...actionFilter,
      ...resourceFilter,
      ...userFilter,
    };

    const [auditLogs, totalItems] = await prisma.$transaction([
      prisma.auditLog.findMany({
        where: whereClause,
        skip,
        take: parsedLimit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
        },
      }),
      prisma.auditLog.count({ where: whereClause }),
    ]);

    return res.status(200).json({
      status: 'success',
      data: {
        auditLogs,
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
