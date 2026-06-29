import jwt from 'jsonwebtoken';
import { Response } from 'express';
import { config } from '../config';

export interface TokenPayload {
  userId: string;
  role: string;
  hospitalId: string | null;
  permissions: string[];
}

export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, config.JWT_ACCESS_SECRET, {
    expiresIn: config.JWT_ACCESS_EXPIRATION as any,
  });
}

export function generateRefreshToken(payload: { userId: string }): string {
  return jwt.sign(payload, config.JWT_REFRESH_SECRET, {
    expiresIn: config.JWT_REFRESH_EXPIRATION as any,
  });
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, config.JWT_ACCESS_SECRET) as TokenPayload;
}

export function verifyRefreshToken(token: string): { userId: string } {
  return jwt.verify(token, config.JWT_REFRESH_SECRET) as { userId: string };
}

export function setRefreshTokenCookie(res: Response, token: string): void {
  const durationInSeconds = parseExpirationToSeconds(config.JWT_REFRESH_EXPIRATION);
  
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: config.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: durationInSeconds * 1000,
    path: '/api/v1/auth', // Scoped only to auth routes for security
  });
}

export function clearRefreshTokenCookie(res: Response): void {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: config.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/v1/auth',
  });
}

// Helper to convert simple strings like "7d" or "24h" to seconds
function parseExpirationToSeconds(exp: string): number {
  const unit = exp.slice(-1);
  const val = parseInt(exp.slice(0, -1), 10);
  
  switch (unit) {
    case 'd': return val * 24 * 60 * 60;
    case 'h': return val * 60 * 60;
    case 'm': return val * 60;
    case 's': return val;
    default: return 7 * 24 * 60 * 60; // default 7 days
  }
}
