import { Admin } from '../models/Admin.js';
import { config } from '../config/env.js';
import { hashPassword } from '../utils/password.js';

/**
 * Creates the initial owner account only when the database has no admins.
 * Existing accounts are never reset from environment variables, so rotating a
 * deployment secret cannot silently change a live password.
 */
export async function ensureAdminBootstrap(): Promise<void> {
  const existing = await Admin.estimatedDocumentCount();
  if (existing > 0) return;

  if (!config.admin.email || !config.admin.password) {
    console.warn(
      '[auth] No admin account exists. Set ADMIN_EMAIL and ADMIN_PASSWORD, then restart to create the first owner.',
    );
    return;
  }

  const passwordHash = await hashPassword(config.admin.password);
  try {
    await Admin.create({
      name: 'Store owner',
      email: config.admin.email,
      passwordHash,
      role: 'owner',
      mustChangePassword: true,
      tokenVersion: 0,
    });

    console.log(`[auth] Initial owner account created for ${config.admin.email}. A password change is required at first sign-in.`);
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && (error as { code: number }).code === 11000) {
      return;
    }
    throw error;
  }
}
