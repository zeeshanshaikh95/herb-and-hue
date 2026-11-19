import bcrypt from 'bcryptjs';
import { isStrongPassword } from '../config/env.js';

const COST = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, COST);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export { isStrongPassword };

export const PASSWORD_POLICY_MESSAGE =
  'Password must be 12–128 characters and include upper case, lower case, a number and a symbol.';
