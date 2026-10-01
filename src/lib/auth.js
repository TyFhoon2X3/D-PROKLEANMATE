import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { getDatabase } from '@/lib/mysql';

const cookieName = 'dpm_session';
const sessionDuration = 60 * 60 * 24 * 7;

function getAuthSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('AUTH_SECRET must contain at least 32 characters');
  }
  return secret;
}

function sign(value) {
  return createHmac('sha256', getAuthSecret()).update(value).digest('base64url');
}

export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password, storedHash) {
  const [salt, expectedHex] = String(storedHash || '').split(':');
  if (!salt || !expectedHex || !/^[a-f0-9]{128}$/i.test(expectedHex)) return false;

  const expected = Buffer.from(expectedHex, 'hex');
  const actual = scryptSync(password, salt, expected.length);
  return timingSafeEqual(actual, expected);
}

export async function createSession(userId) {
  const expiresAt = Math.floor(Date.now() / 1000) + sessionDuration;
  const payload = Buffer.from(JSON.stringify({ userId, expiresAt })).toString('base64url');
  const token = `${payload}.${sign(payload)}`;
  const cookieStore = await cookies();
  cookieStore.set(cookieName, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: sessionDuration,
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(cookieName);
}

function readSession(token) {
  if (!token) return null;
  const [payload, suppliedSignature] = token.split('.');
  if (!payload || !suppliedSignature) return null;

  const expectedSignature = Buffer.from(sign(payload));
  const actualSignature = Buffer.from(suppliedSignature);
  if (actualSignature.length !== expectedSignature.length || !timingSafeEqual(actualSignature, expectedSignature)) return null;

  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (!Number.isSafeInteger(session.userId) || session.expiresAt <= Date.now() / 1000) return null;
    return session;
  } catch {
    return null;
  }
}

export async function getSessionUser() {
  const cookieStore = await cookies();
  const session = readSession(cookieStore.get(cookieName)?.value);
  if (!session) return null;

  const database = getDatabase();
  const [rows] = await database.execute(
    'SELECT id, email, username, full_name, phone, role, created_at FROM users WHERE id = ?',
    [session.userId],
  );
  return rows[0] || null;
}