import type { Request, Response } from 'express';
import { Admin } from '../models/Admin.js';
import { AppError } from '../utils/AppError.js';
import { signAdminToken } from '../utils/authToken.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import type { changePasswordSchema, loginSchema } from '../validation/schemas.js';
import type { z } from 'zod';

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

function adminDto(admin: {
  _id: unknown;
  name: string;
  email: string;
  role: string;
  mustChangePassword: boolean;
  lastLoginAt: Date | null;
}) {
  return {
    id: String(admin._id),
    name: admin.name,
    email: admin.email,
    role: admin.role,
    mustChangePassword: admin.mustChangePassword,
    lastLoginAt: admin.lastLoginAt,
  };
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body as z.infer<typeof loginSchema>;

  const admin = await Admin.findOne({ email }).select('+passwordHash');
  const genericFailure = AppError.unauthorized('invalid_credentials', 'Email or password is incorrect.');

  if (!admin) {
    // Keep timing roughly comparable to a bcrypt comparison.
    await verifyPassword(password, '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv');
    throw genericFailure;
  }

  if (admin.lockedUntil && admin.lockedUntil.getTime() > Date.now()) {
    throw new AppError(
      423,
      'account_locked',
      'Too many failed attempts. This account is temporarily locked; try again later.',
    );
  }

  const passwordMatches = await verifyPassword(password, admin.passwordHash);
  if (!passwordMatches) {
    admin.failedLoginAttempts += 1;
    if (admin.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
      admin.lockedUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000);
      admin.failedLoginAttempts = 0;
    }
    await admin.save();
    throw genericFailure;
  }

  admin.failedLoginAttempts = 0;
  admin.lockedUntil = null;
  admin.lastLoginAt = new Date();
  await admin.save();

  const { token, expiresIn } = signAdminToken({
    id: String(admin._id),
    tokenVersion: admin.tokenVersion,
    role: admin.role,
  });

  res.setHeader('Cache-Control', 'no-store');
  res.json({
    data: {
      token,
      expiresIn,
      admin: adminDto(admin),
      mustChangePassword: admin.mustChangePassword,
    },
  });
}

export async function me(req: Request, res: Response): Promise<void> {
  if (!req.admin) throw AppError.unauthorized('unauthenticated', 'Sign in to continue.');
  res.setHeader('Cache-Control', 'no-store');
  res.json({ data: { admin: adminDto(req.admin), mustChangePassword: req.admin.mustChangePassword } });
}

export async function changePassword(req: Request, res: Response): Promise<void> {
  if (!req.admin) throw AppError.unauthorized('unauthenticated', 'Sign in to continue.');
  const { currentPassword, newPassword } = req.body as z.infer<typeof changePasswordSchema>;

  const admin = await Admin.findById(req.admin._id).select('+passwordHash');
  if (!admin) throw AppError.unauthorized('account_missing', 'This account is no longer available.');

  const matches = await verifyPassword(currentPassword, admin.passwordHash);
  if (!matches) {
    throw AppError.badRequest('invalid_current_password', 'Your current password is incorrect.');
  }

  admin.passwordHash = await hashPassword(newPassword);
  admin.mustChangePassword = false;
  // Revoke every previously issued token, then issue one for this session.
  admin.tokenVersion += 1;
  await admin.save();

  const { token, expiresIn } = signAdminToken({
    id: String(admin._id),
    tokenVersion: admin.tokenVersion,
    role: admin.role,
  });

  res.setHeader('Cache-Control', 'no-store');
  res.json({
    data: {
      token,
      expiresIn,
      admin: adminDto(admin),
      message: 'Password updated. Other sessions have been signed out.',
    },
  });
}

export async function logout(req: Request, res: Response): Promise<void> {
  if (!req.admin) throw AppError.unauthorized('unauthenticated', 'Sign in to continue.');
  const admin = await Admin.findById(req.admin._id);
  if (admin) {
    admin.tokenVersion += 1;
    await admin.save();
  }
  res.status(200).json({ data: { message: 'Signed out.' } });
}
