import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import { logger } from '../utils/logger';

export async function getNotifications(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user!;

    const notifications = await prisma.notification.findMany({
      where: { userId: user.userId },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json({
      status: 'success',
      data: { notifications },
    });
  } catch (error) {
    next(error);
  }
}

export async function markNotificationAsRead(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user!;
    const { id } = req.params;

    const notification = await prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundError('Notification not found');
    }

    if (notification.userId !== user.userId) {
      throw new ForbiddenError('Unauthorized to modify this notification');
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { read: true },
    });

    logger.debug(`Notification marked as read: ${id} by user: ${user.userId}`);

    return res.status(200).json({
      status: 'success',
      data: { notification: updated },
    });
  } catch (error) {
    next(error);
  }
}
