import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";

// Lab sessions live in memory (Map). Deliberate for teaching: no crypto, no DB.
// production would use a database/Redis/EHCache, or encrypted stateless cookie sessions.
// In-memory also means: sessions disappear when "next dev" restarts - that is
// normal here, not a bug.

export const SESSION_TTL_SECONDS = 60 * 60 * 4; // 4h lab session
export const FLOW_COOKIE_TTL_SECONDS = 60 * 10; // handshake cookies live 10 minutes

export type SessionUser = {
  sub: string; // stable Keycloak user id, what Phase 6 keys roles Authclaims to
  username?: string; // preferred_username claim
  name?: string; // "name" claim (Alice Lab)
  email?: string;
};

export type SessionData = {
  id: string;
  user: SessionUser;
  idToken: string; // required as id_token_hint at IdP logout
  createdAt: number;
};

// Next.js dev-mode compiles every route into its own bundle, so a plain module
// const would give /auth/* one Map and the pages another. Anchoring the store to
// globalThis guarantees a single instance per server process (the same trick the
// Next.js docs use for database clients; in production one bundle ships anyway).
const globalForSessions = globalThis as unknown as { __ssoLabSessions?: Map<string, SessionData> };

const sessions = globalForSessions.__ssoLabSessions ?? new Map<string, SessionData>();
globalForSessions.__ssoLabSessions = sessions;

function sweepExpiredSessions() {
  const now = Date.now();
  const ttlMs = SESSION_TTL_SECONDS * 1000;
  for (const [id, session] of sessions) {
    if (now - session.createdAt > ttlMs) sessions.delete(id);
  }
}

// returns the random session id (also the map key) to place into the cookie
export function createSession(user: SessionUser, idToken: string): string {
  sweepExpiredSessions();
  const id = randomBytes(16).toString("base64url"); // 128-bit unguessable
  sessions.set(id, { id, user, idToken, createdAt: Date.now() });
  return id;
}

export function destroySession(id: string | undefined | null) {
  if (id) sessions.delete(id);
}

export function getSessionById(id: string | undefined | null): SessionData | null {
  if (!id) return null;
  const session = sessions.get(id);
  if (!session) return null;
  if (Date.now() - session.createdAt > SESSION_TTL_SECONDS * 1000) {
    sessions.delete(id);
    return null;
  }
  return session;
}

// server components: async in Next 16 (cookies() is async)
export async function getServerSession(): Promise<SessionData | null> {
  const jar = await cookies();
  return getSessionById(jar.get(SESSION_COOKIE)?.value);
}

export const SESSION_COOKIE = "sso_lab_session";

// shared cookie settings for both handshake and session cookies
export function baseCookieOptions() {
  return {
    httpOnly: true, // JS (document.cookie) must not read it
    sameSite: "lax" as const, // allowed on top-level GET navigations (our redirects)
    path: "/",
    secure: process.env.NODE_ENV === "production", // HTTPS-only in prod; dev runs plain http
  };
}
