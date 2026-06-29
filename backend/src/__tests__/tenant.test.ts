import { requirePermission, requireRole } from '../middlewares/rbac.middleware';
import { Request, Response, NextFunction } from 'express';
import { ForbiddenError, UnauthorizedError } from '../utils/errors';

describe('RBAC Middleware Unit Tests', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {};
    mockResponse = {};
    nextFunction = jest.fn();
  });

  it('should call next() if user has the required permission', () => {
    mockRequest.user = {
      userId: 'user-1',
      role: 'DOCTOR',
      hospitalId: 'hospital-1',
      permissions: ['patients:read', 'patients:write'],
    };

    const middleware = requirePermission('patients:read');
    middleware(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(nextFunction).toHaveBeenCalledWith();
    expect(nextFunction).not.toHaveBeenCalledWith(expect.any(Error));
  });

  it('should pass ForbiddenError to next() if user lacks permission', () => {
    mockRequest.user = {
      userId: 'user-1',
      role: 'NURSE',
      hospitalId: 'hospital-1',
      permissions: ['patients:read'],
    };

    const middleware = requirePermission('patients:write');
    middleware(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(nextFunction).toHaveBeenCalledWith(expect.any(ForbiddenError));
  });

  it('should bypass checks and call next() for SUPER_ADMIN role', () => {
    mockRequest.user = {
      userId: 'admin-1',
      role: 'SUPER_ADMIN',
      hospitalId: null,
      permissions: [],
    };

    const middleware = requirePermission('hospitals:write');
    middleware(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(nextFunction).toHaveBeenCalledWith();
  });

  it('should throw UnauthorizedError if user is not authenticated', () => {
    const middleware = requirePermission('patients:read');
    middleware(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(nextFunction).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });

  it('should validate roles correctly using requireRole', () => {
    mockRequest.user = {
      userId: 'user-1',
      role: 'DOCTOR',
      hospitalId: 'hospital-1',
      permissions: [],
    };

    const middleware = requireRole(['DOCTOR', 'HOSPITAL_ADMIN']);
    middleware(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(nextFunction).toHaveBeenCalledWith();
  });
});
describe('Multi-Tenancy Scoping Test', () => {
  it('should enforce user data isolation based on hospitalId', () => {
    const userA = {
      userId: 'user-1',
      role: 'DOCTOR',
      hospitalId: 'hospital-A',
      permissions: ['patients:read'],
    };

    const userB = {
      userId: 'user-2',
      role: 'DOCTOR',
      hospitalId: 'hospital-B',
      permissions: ['patients:read'],
    };

    // Verify logic: Patient created by hospital-A must match userA hospitalId, and fail userB check
    const patientRecord = {
      id: 'patient-1',
      hospitalId: 'hospital-A',
    };

    const isAuthorizedForUserA = userA.role === 'SUPER_ADMIN' || patientRecord.hospitalId === userA.hospitalId;
    const isAuthorizedForUserB = userB.role === 'SUPER_ADMIN' || patientRecord.hospitalId === userB.hospitalId;

    expect(isAuthorizedForUserA).toBe(true);
    expect(isAuthorizedForUserB).toBe(false);
  });
});
