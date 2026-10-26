import { io } from "next/cache";
import { getServerSession } from "@/lib/session";

// Async component: reads cookies at request time (dynamic), executed inside
// the Suspense boundary of page.tsx.
export async function DashboardContent() {
  // Cache Components rule: getServerSession's TTL check calls Date.now() -
  // an "unstable value" that changes between renders. await io() suspends
  // during prerendering, so the static shell keeps the Suspense fallback and
  // this content renders fresh per request (real requests: io() no-ops).
  await io();
  const session = await getServerSession();

  if (!session) {
    return (
      <div>
        <p className="banner">No active session &mdash; this page is protected.</p>
        <a className="btn" href="/login">
          Sign in with SSO
        </a>
      </div>
    );
  }

  const { user, createdAt } = session;
  return (
    <div>
      <p>
        Signed in session id: <code>{session.id.slice(0, 8)}...</code> &nbsp;
        (rotated at login &mdash; fixation protection)
      </p>
      <dl className="kv">
        <dt>Username (preferred_username)</dt>
        <dd>{user.username ?? "(claim absent)"}</dd>
        <dt>Name</dt>
        <dd>{user.name ?? "(claim absent)"}</dd>
        <dt>Email</dt>
        <dd>{user.email ?? "(claim absent)"}</dd>
        <dt>Subject (sub)</dt>
        <dd><code>{user.sub}</code></dd>
        <dt>Roles</dt>
        <dd>not mapped yet &mdash; Phase 6 is where realm roles arrive</dd>
        <dt>Session created</dt>
        <dd>{new Date(createdAt).toLocaleTimeString()}</dd>
      </dl>
      <a className="btn" href="/auth/logout">
        Sign out
      </a>
    </div>
  );
}
