import express, { NextFunction, Request, Response } from 'express';
import { SignJWT, jwtVerify } from 'jose';
import { createHash, timingSafeEqual } from 'crypto';
import { pickLang, msg } from './i18nErrors';

const ADMIN_SESSION_COOKIE = 'llmcalc_admin_session';
const ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 24; // 24 hours
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

export interface AdminUser {
  id: string;
  name: string;
  isAdmin: true;
}

// Synthetic user object used when an admin authenticates via username/password.
export const ADMIN_LOCAL_USER: AdminUser = {
  id: 'admin-local',
  name: 'Yönetici',
  isAdmin: true,
};

interface LockState {
  fails: number;
  lockedUntil: number | null;
}

// In-memory brute-force lockout keyed by client IP. Resets on server restart.
const lockout = new Map<string, LockState>();

function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET || 'insecure-dev-secret-change-me';
  return new TextEncoder().encode(secret);
}

function safeEqual(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a).digest();
  const hb = createHash('sha256').update(b).digest();
  return timingSafeEqual(ha, hb);
}

function credentialsConfigured(): boolean {
  return Boolean(process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD);
}

function parseCookies(req: Request): Record<string, string> {
  const header = req.headers.cookie || '';
  const out: Record<string, string> = {};
  header.split(';').forEach((pair) => {
    const idx = pair.indexOf('=');
    if (idx > -1) {
      out[pair.slice(0, idx).trim()] = decodeURIComponent(pair.slice(idx + 1).trim());
    }
  });
  return out;
}

function isLocked(ip: string): boolean {
  const state = lockout.get(ip);
  if (!state) return false;
  if (state.lockedUntil) {
    if (state.lockedUntil > Date.now()) return true;
    // Lock expired — reset the entry.
    lockout.delete(ip);
  }
  return false;
}

function registerFailure(ip: string): boolean {
  const state = lockout.get(ip) || { fails: 0, lockedUntil: null };
  state.fails += 1;
  if (state.fails >= MAX_FAILED_ATTEMPTS) {
    state.lockedUntil = Date.now() + LOCKOUT_MS;
  }
  lockout.set(ip, state);
  return Boolean(state.lockedUntil);
}

function clearFailures(ip: string): void {
  lockout.delete(ip);
}

// Periodically prune the lockout map to avoid unbounded growth.
const pruneTimer = setInterval(() => {
  const now = Date.now();
  for (const [ip, state] of lockout) {
    if (state.lockedUntil && state.lockedUntil <= now) {
      lockout.delete(ip);
    } else if (!state.lockedUntil && state.fails === 0) {
      lockout.delete(ip);
    }
  }
}, 60 * 60 * 1000);
pruneTimer.unref?.();

export const adminAuthRouter = express.Router();

adminAuthRouter.post('/login', async (req, res) => {
  const lang = pickLang(req);
  if (!credentialsConfigured()) {
    return res.status(500).json({ error: msg(lang, 'ADMIN_USERNAME / ADMIN_PASSWORD ortam değişkenleri tanımlı değil.', 'ADMIN_USERNAME / ADMIN_PASSWORD environment variables are not set.') });
  }

  const ip = req.ip || 'unknown';
  if (isLocked(ip)) {
    return res.status(429).json({ error: msg(lang, 'Çok fazla hatalı deneme. Lütfen 15 dakika sonra tekrar deneyin.', 'Too many failed attempts. Please try again in 15 minutes.') });
  }

  const { username, password } = req.body || {};
  if (typeof username !== 'string' || typeof password !== 'string' || !username || !password) {
    return res.status(400).json({ error: msg(lang, 'Kullanıcı adı ve şifre gerekli.', 'Username and password are required.') });
  }

  const valid =
    safeEqual(username, process.env.ADMIN_USERNAME!) && safeEqual(password, process.env.ADMIN_PASSWORD!);

  if (!valid) {
    const lockedNow = registerFailure(ip);
    const status = lockedNow ? 429 : 401;
    const message = lockedNow
      ? 'Çok fazla hatalı deneme. Lütfen 15 dakika sonra tekrar deneyin.'
      : 'Kullanıcı adı veya şifre hatalı.';
    return res.status(status).json({ error: message });
  }

  clearFailures(ip);

  const now = Date.now();
  const expiresAt = new Date(now + ADMIN_SESSION_TTL_SECONDS * 1000);
  const jwt = await new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .sign(getSecretKey());

  res.setHeader(
    'Set-Cookie',
    `${ADMIN_SESSION_COOKIE}=${jwt}; HttpOnly; Path=/; Max-Age=${ADMIN_SESSION_TTL_SECONDS}; SameSite=Lax`
  );
  res.json({ ok: true });
});

adminAuthRouter.get('/me', async (req, res) => {
  const admin = await getAdminUser(req);
  if (!admin) {
    return res.status(401).json({ admin: null });
  }
  res.json({ admin });
});

adminAuthRouter.post('/logout', (req, res) => {
  res.setHeader(
    'Set-Cookie',
    `${ADMIN_SESSION_COOKIE}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`
  );
  res.json({ ok: true });
});

export async function getAdminUser(req: Request): Promise<AdminUser | null> {
  if (!credentialsConfigured()) return null;
  const cookies = parseCookies(req);
  const jwt = cookies[ADMIN_SESSION_COOKIE];
  if (!jwt) return null;

  try {
    const { payload } = await jwtVerify(jwt, getSecretKey());
    if (payload.role !== 'admin') return null;
    return ADMIN_LOCAL_USER;
  } catch {
    return null;
  }
}

// Guards admin-only endpoints (catalog/price refresh) with the local
// username/password admin session.
export async function requireAdminSession(req: Request, res: Response, next: NextFunction): Promise<void> {
  const lang = pickLang(req);
  const admin = await getAdminUser(req);
  if (!admin) {
    res.status(401).json({ error: msg(lang, 'Bu işlem için yönetici oturumu gerekli.', 'An admin session is required for this operation.') });
    return;
  }
  next();
}