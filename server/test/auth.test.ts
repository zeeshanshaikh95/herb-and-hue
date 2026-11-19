import jwt from 'jsonwebtoken';
import { beforeEach, describe, expect, it } from 'vitest';
import { config } from '../src/config/env.js';
import { Admin } from '../src/models/Admin.js';
import { ensureAdminBootstrap } from '../src/services/adminBootstrap.js';
import { verifyAdminToken } from '../src/utils/authToken.js';
import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  clearDatabase,
  createAdmin,
  request,
  app,
  tokenFor,
} from './helpers.js';

const login = (password: string, email = ADMIN_EMAIL) =>
  request(app).post('/api/admin/auth/login').send({ email, password });

describe('admin authentication', () => {
  beforeEach(clearDatabase);

  it('signs in with valid credentials and returns an HS256 token', async () => {
    await createAdmin();
    const response = await login(ADMIN_PASSWORD);

    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.body.data.admin.email).toBe(ADMIN_EMAIL);
    expect(response.body.data.admin.passwordHash).toBeUndefined();

    const decoded = jwt.decode(response.body.data.token, { complete: true });
    expect(decoded?.header.alg).toBe('HS256');
    expect(decoded?.header.typ).toBe('JWT');
    expect(decoded?.payload.sub).toBeTruthy();
  });

  it('rejects a wrong password without revealing whether the email exists', async () => {
    await createAdmin();
    const wrongPassword = await login('WrongPassword!1234');
    const unknownEmail = await login('WrongPassword!1234', 'nobody@herb-and-hue.test');

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body.error.code).toBe('invalid_credentials');
    expect(unknownEmail.body.error.code).toBe('invalid_credentials');
    expect(wrongPassword.body.error.message).toBe(unknownEmail.body.error.message);
  });

  it('locks the account after five failed attempts', async () => {
    await createAdmin();
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await login('WrongPassword!1234');
      expect(response.status).toBe(401);
    }
    const locked = await login(ADMIN_PASSWORD);
    expect(locked.status).toBe(423);
    expect(locked.body.error.code).toBe('account_locked');
  });

  it('rejects malformed login bodies with field details', async () => {
    const response = await request(app)
      .post('/api/admin/auth/login')
      .send({ email: 'not-an-email', password: '' });
    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe('validation_failed');
    expect(response.body.error.details.length).toBeGreaterThanOrEqual(2);
  });

  it('requires a bearer token for privileged endpoints', async () => {
    const response = await request(app).get('/api/admin/products');
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('unauthenticated');
  });

  it('rejects a token signed with the wrong secret', async () => {
    const admin = await createAdmin();
    const forged = jwt.sign({ tv: 0, role: 'owner' }, 'x'.repeat(48), {
      algorithm: 'HS256',
      subject: String(admin._id),
      issuer: 'herb-and-hue',
      audience: 'herb-and-hue-admin',
      expiresIn: '1h',
    });
    expect(() => verifyAdminToken(forged)).toThrow();
    const response = await request(app).get('/api/admin/auth/me').set('Authorization', `Bearer ${forged}`);
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('invalid_token');
  });

  it('rejects tokens with the wrong algorithm', async () => {
    const admin = await createAdmin();
    const token = jwt.sign({ tv: 0, role: 'owner' }, config.jwtSecret, {
      algorithm: 'HS384',
      subject: String(admin._id),
      issuer: 'herb-and-hue',
      audience: 'herb-and-hue-admin',
      expiresIn: '1h',
    });
    const response = await request(app).get('/api/admin/auth/me').set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('invalid_token');
  });

  it('rejects expired tokens', async () => {
    const admin = await createAdmin();
    const token = jwt.sign({ tv: 0, role: 'owner' }, config.jwtSecret, {
      algorithm: 'HS256',
      subject: String(admin._id),
      issuer: 'herb-and-hue',
      audience: 'herb-and-hue-admin',
      expiresIn: '-10s',
    });
    const response = await request(app).get('/api/admin/auth/me').set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('token_expired');
  });

  it('revokes old tokens after a password change', async () => {
    const admin = await createAdmin();
    const oldToken = tokenFor(admin);
    const newPassword = 'Rotated!Passw0rd2026';

    const changed = await request(app)
      .post('/api/admin/auth/change-password')
      .set('Authorization', `Bearer ${oldToken}`)
      .send({ currentPassword: ADMIN_PASSWORD, newPassword });

    expect(changed.status).toBe(200);
    expect(changed.body.data.admin.mustChangePassword).toBe(false);

    const oldSession = await request(app)
      .get('/api/admin/auth/me')
      .set('Authorization', `Bearer ${oldToken}`);
    expect(oldSession.status).toBe(401);
    expect(oldSession.body.error.code).toBe('session_revoked');

    const newSession = await request(app)
      .get('/api/admin/auth/me')
      .set('Authorization', `Bearer ${changed.body.data.token}`);
    expect(newSession.status).toBe(200);
  });

  it('enforces the password policy and rejects reusing the current password', async () => {
    const { header } = await (async () => {
      const admin = await createAdmin();
      return { header: `Bearer ${tokenFor(admin)}` };
    })();

    const weak = await request(app)
      .post('/api/admin/auth/change-password')
      .set('Authorization', header)
      .send({ currentPassword: ADMIN_PASSWORD, newPassword: 'short' });
    expect(weak.status).toBe(422);

    const reused = await request(app)
      .post('/api/admin/auth/change-password')
      .set('Authorization', header)
      .send({ currentPassword: ADMIN_PASSWORD, newPassword: ADMIN_PASSWORD });
    expect(reused.status).toBe(422);
  });

  it('revokes the session on logout', async () => {
    const admin = await createAdmin();
    const token = tokenFor(admin);
    const response = await request(app)
      .post('/api/admin/auth/logout')
      .set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(200);

    const after = await request(app).get('/api/admin/auth/me').set('Authorization', `Bearer ${token}`);
    expect(after.status).toBe(401);
    expect(after.body.error.code).toBe('session_revoked');
  });

  it('requires a password change at first sign-in until one is made', async () => {
    await createAdmin({ mustChangePassword: true });
    const response = await login(ADMIN_PASSWORD);
    expect(response.status).toBe(200);
    expect(response.body.data.mustChangePassword).toBe(true);
  });

  it('does not reset an existing admin password during bootstrap', async () => {
    const admin = await createAdmin();
    const before = await Admin.findById(admin._id).select('+passwordHash').lean();
    await ensureAdminBootstrap();
    const after = await Admin.findById(admin._id).select('+passwordHash').lean();
    expect(await Admin.countDocuments()).toBe(1);
    expect(after?.passwordHash).toBe(before?.passwordHash);
    expect(after?.tokenVersion).toBe(before?.tokenVersion);
  });
});
