import express, { NextFunction, Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { SignJWT, jwtVerify } from 'jose';
import { randomUUID } from 'crypto';
import { getPool } from './db';

const SESSION_COOKIE = 'llmcalc_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

export interface AuthUser {
  id: string;
  googleSub: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  isAdmin: boolean;
}

export interface AuthenticatedRequest extends Request {
  user: AuthUser;
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

function getOAuthClient(): OAuth2Client {
  return new OAuth2Client({
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_CALLBACK_URL,
  });
}

function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET || 'insecure-dev-secret-change-me';
  return new TextEncoder().encode(secret);
}

function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const admins = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return admins.includes(email.toLowerCase());
}

export const authRouter = express.Router();

// Redirect the user to Google's consent screen
authRouter.get('/google', (req, res) => {
  const client = getOAuthClient();
  const state = randomUUID();
  const scopes = [
    'openid',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
  ];
  const url = client.generateAuthUrl({
    access_type: 'online',
    scope: scopes,
    state,
    prompt: 'select_account',
  });
  res.setHeader('Set-Cookie', `oauth_state=${state}; HttpOnly; Path=/; Max-Age=600; SameSite=Lax`);
  res.redirect(url);
});

// Handle the OAuth2 callback
authRouter.get('/google/callback', async (req, res) => {
  try {
    const { code, state, error } = req.query as Record<string, string>;
    const cookies = parseCookies(req);

    if (error) {
      return res.redirect('/?auth=error');
    }
    if (!code) {
      return res.redirect('/?auth=error');
    }
    if (state && cookies.oauth_state && state !== cookies.oauth_state) {
      return res.redirect('/?auth=error');
    }

    const client = getOAuthClient();
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    const userinfo = await client.request<{
      sub: string;
      email: string;
      name?: string;
      picture?: string;
      email_verified?: boolean;
    }>({
      url: 'https://www.googleapis.com/oauth2/v3/userinfo',
    });

    const profile = userinfo.data;
    if (!profile.sub || !profile.email) {
      return res.redirect('/?auth=error');
    }

    const pool = getPool();

    const upsert = await pool.query<{ id: string }>(
      `INSERT INTO users (google_sub, email, name, avatar_url)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (google_sub)
       DO UPDATE SET email = EXCLUDED.email, name = EXCLUDED.name, avatar_url = EXCLUDED.avatar_url
       RETURNING id`,
      [profile.sub, profile.email, profile.name || null, profile.picture || null]
    );
    const userId = upsert.rows[0].id;

    const sessionId = randomUUID();
    const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);
    await pool.query(
      `INSERT INTO sessions (id, user_id, expires_at) VALUES ($1, $2, $3)`,
      [sessionId, userId, expiresAt]
    );

    const jwt = await new SignJWT({ sub: userId, sid: sessionId })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
      .sign(getSecretKey());

    res.setHeader(
      'Set-Cookie',
      `${SESSION_COOKIE}=${jwt}; HttpOnly; Path=/; Max-Age=${SESSION_TTL_SECONDS}; SameSite=Lax`
    );

    const appUrl = process.env.APP_URL || '/';
    res.redirect(`${appUrl}/?auth=success`);
  } catch (err: any) {
    console.error('Google OAuth callback error:', err?.message);
    res.redirect('/?auth=error');
  }
});

authRouter.get('/logout', async (req, res) => {
  const cookies = parseCookies(req);
  const jwt = cookies[SESSION_COOKIE];
  if (jwt) {
    try {
      const { payload } = await jwtVerify(jwt, getSecretKey());
      const sid = payload.sid as string;
      if (sid) {
        await getPool().query(`DELETE FROM sessions WHERE id = $1`, [sid]);
      }
    } catch {
      // Invalid or expired token, ignore.
    }
  }
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`);
  res.redirect('/');
});

authRouter.get('/me', async (req, res) => {
  const user = await getSessionUser(req);
  if (!user) {
    return res.status(401).json({ user: null });
  }
  res.json({ user });
});

export async function getSessionUser(req: Request): Promise<AuthUser | null> {
  const cookies = parseCookies(req);
  const jwt = cookies[SESSION_COOKIE];
  if (!jwt) return null;

  try {
    const { payload } = await jwtVerify(jwt, getSecretKey());
    const userId = payload.sub as string;
    const sid = payload.sid as string;
    if (!userId || !sid) return null;

    const pool = getPool();
    const sessionRes = await pool.query(
      `SELECT s.expires_at FROM sessions s WHERE s.id = $1 AND s.user_id = $2`,
      [sid, userId]
    );
    if (sessionRes.rowCount === 0) return null;
    if (new Date(sessionRes.rows[0].expires_at).getTime() < Date.now()) {
      await pool.query(`DELETE FROM sessions WHERE id = $1`, [sid]);
      return null;
    }

    const userRes = await pool.query(
      `SELECT id, google_sub, email, name, avatar_url FROM users WHERE id = $1`,
      [userId]
    );
    if (userRes.rowCount === 0) return null;

    const row = userRes.rows[0];
    return {
      id: row.id,
      googleSub: row.google_sub,
      email: row.email,
      name: row.name,
      avatarUrl: row.avatar_url,
      isAdmin: isAdminEmail(row.email),
    };
  } catch {
    return null;
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const user = await getSessionUser(req);
  if (!user) {
    res.status(401).json({ error: 'Oturum açmanız gerekiyor.' });
    return;
  }
  (req as AuthenticatedRequest).user = user;
  next();
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  const user = await getSessionUser(req);
  if (!user) {
    res.status(401).json({ error: 'Oturum açmanız gerekiyor.' });
    return;
  }
  if (!user.isAdmin) {
    res.status(403).json({ error: 'Bu işlem için yetkiniz yok.' });
    return;
  }
  (req as AuthenticatedRequest).user = user;
  next();
}