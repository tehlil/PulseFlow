import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/db';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
} from '../utils/jwt';
import { registerSchema, loginSchema } from '../validators/auth.validator';
import { ConflictError, UnauthorizedError, NotFoundError } from '../utils/errors';
import { logger } from '../utils/logger';

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const validated = registerSchema.parse(req.body);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Check if hospital slug already exists
      const existingHospital = await tx.hospital.findUnique({
        where: { slug: validated.hospitalSlug },
      });
      if (existingHospital) {
        throw new ConflictError('Hospital slug is already in use');
      }

      // 2. Check if user email already exists
      const existingUser = await tx.user.findUnique({
        where: { email: validated.email },
      });
      if (existingUser) {
        throw new ConflictError('Email address is already registered');
      }

      // 3. Find the Hospital Admin role
      const adminRole = await tx.role.findUnique({
        where: { name: 'HOSPITAL_ADMIN' },
      });
      if (!adminRole) {
        throw new NotFoundError('Hospital Admin role not configured');
      }

      // 4. Create the Hospital
      const hospital = await tx.hospital.create({
        data: {
          name: validated.hospitalName,
          slug: validated.hospitalSlug,
          status: 'ACTIVE',
        },
      });

      // 5. Hash the password
      const passwordHash = await bcrypt.hash(validated.password, 10);

      // 6. Create the Hospital Admin User
      const user = await tx.user.create({
        data: {
          email: validated.email,
          passwordHash,
          firstName: validated.firstName,
          lastName: validated.lastName,
          roleId: adminRole.id,
          hospitalId: hospital.id,
          status: 'ACTIVE',
        },
      });

      // 7. Write audit log
      await tx.auditLog.create({
        data: {
          action: 'TENANT_REGISTER',
          resource: 'HOSPITAL',
          resourceId: hospital.id,
          userId: user.id,
          hospitalId: hospital.id,
          metadata: { email: user.email, hospitalName: hospital.name },
        },
      });

      return { user, hospital };
    });

    logger.info(`New tenant registered: ${result.hospital.name} (Admin: ${result.user.email})`);

    return res.status(201).json({
      status: 'success',
      message: 'Hospital registered successfully',
      data: {
        hospital: {
          id: result.hospital.id,
          name: result.hospital.name,
          slug: result.hospital.slug,
        },
        user: {
          id: result.user.id,
          email: result.user.email,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const validated = loginSchema.parse(req.body);

    // 1. Fetch user by email
    const user = await prisma.user.findUnique({
      where: { email: validated.email },
      include: {
        role: {
          include: {
            permissions: true,
          },
        },
      },
    });

    if (!user || user.status !== 'ACTIVE' || user.deletedAt) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // 2. Compare password
    const isPasswordValid = await bcrypt.compare(validated.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // 3. Extract permissions
    const permissions = user.role.permissions.map((p) => p.name);

    // 4. Generate tokens
    const accessToken = generateAccessToken({
      userId: user.id,
      role: user.role.name,
      hospitalId: user.hospitalId,
      permissions,
    });

    const refreshToken = generateRefreshToken({ userId: user.id });

    // 5. Store refresh token in database (7 days expiration)
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    // 6. Set refresh token in HTTP-only cookie
    setRefreshTokenCookie(res, refreshToken);

    // 7. Write audit log
    await prisma.auditLog.create({
      data: {
        action: 'USER_LOGIN',
        resource: 'USER',
        resourceId: user.id,
        userId: user.id,
        hospitalId: user.hospitalId,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
    });

    logger.info(`User logged in: ${user.email} (Role: ${user.role.name})`);

    return res.status(200).json({
      status: 'success',
      data: {
        accessToken,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role.name,
          hospitalId: user.hospitalId,
          permissions,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (refreshToken) {
      // Revoke token in DB
      await prisma.refreshToken.updateMany({
        where: { token: refreshToken },
        data: { revoked: true },
      });

      // Decode to identify user for audit log
      try {
        const decoded = verifyRefreshToken(refreshToken);
        const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
        if (user) {
          await prisma.auditLog.create({
            data: {
              action: 'USER_LOGOUT',
              resource: 'USER',
              resourceId: user.id,
              userId: user.id,
              hospitalId: user.hospitalId,
              ipAddress: req.ip,
              userAgent: req.headers['user-agent'],
            },
          });
        }
      } catch (err) {
        // Suppress decode error on invalid/expired refresh token logout
      }
    }

    clearRefreshTokenCookie(res);

    return res.status(200).json({
      status: 'success',
      message: 'Logged out successfully',
    });
  } catch (error) {
    next(error);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const oldRefreshToken = req.cookies.refreshToken;
    if (!oldRefreshToken) {
      throw new UnauthorizedError('Refresh token is required');
    }

    // 1. Verify token sign
    let decoded;
    try {
      decoded = verifyRefreshToken(oldRefreshToken);
    } catch (err) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    // 2. Check in database
    const dbToken = await prisma.refreshToken.findUnique({
      where: { token: oldRefreshToken },
    });

    if (!dbToken || dbToken.revoked || dbToken.expiresAt < new Date()) {
      // Standard token reuse detection: if client sends a revoked/expired token,
      // revoke all tokens for safety
      if (dbToken && dbToken.revoked) {
        logger.warn(`Security alert: Revoked refresh token reuse attempt by user ${dbToken.userId}`);
        await prisma.refreshToken.updateMany({
          where: { userId: dbToken.userId },
          data: { revoked: true },
        });
      }
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    // 3. Rotate tokens: Revoke old one
    await prisma.refreshToken.update({
      where: { id: dbToken.id },
      data: { revoked: true },
    });

    // 4. Fetch user details to sign new access token
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        role: {
          include: {
            permissions: true,
          },
        },
      },
    });

    if (!user || user.status !== 'ACTIVE' || user.deletedAt) {
      throw new UnauthorizedError('Account is inactive or does not exist');
    }

    const permissions = user.role.permissions.map((p) => p.name);

    // 5. Generate new pair
    const accessToken = generateAccessToken({
      userId: user.id,
      role: user.role.name,
      hospitalId: user.hospitalId,
      permissions,
    });

    const newRefreshToken = generateRefreshToken({ userId: user.id });

    // 6. Save new refresh token (7 days)
    await prisma.refreshToken.create({
      data: {
        token: newRefreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    // 7. Update cookie
    setRefreshTokenCookie(res, newRefreshToken);

    return res.status(200).json({
      status: 'success',
      data: {
        accessToken,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role.name,
          hospitalId: user.hospitalId,
          permissions,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw new UnauthorizedError('User context not found');
    }
    return res.status(200).json({
      status: 'success',
      data: {
        user: req.user,
      },
    });
  } catch (error) {
    next(error);
  }
}
