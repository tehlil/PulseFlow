import { Request, Response, NextFunction } from 'express';
import { ForbiddenError, UnauthorizedError } from '../utils/errors';

/**
 * Middleware to enforce specific permissions.
 * SUPER_ADMIN is granted implicit permission bypass.
 */
export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    // SUPER_ADMIN has access to everything
    if (req.user.role === 'SUPER_ADMIN') {
      return next();
    }

    const hasPermission = req.user.permissions.includes(permission);
    if (!hasPermission) {
      return next(new ForbiddenError(`Missing required permission: ${permission}`));
    }

    next();
  };
}

/**
 * Middleware to enforce role membership.
 */
export function requireRole(roles: string | string[]) {
  const roleList = typeof roles === 'string' ? [roles] : roles;
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    if (roleList.includes(req.user.role)) {
      return next();
    }

    next(new ForbiddenError('Access denied: insufficient role privileges'));
  };
}
