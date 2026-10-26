import { Suspense } from "react";
import { SESSION_TTL_SECONDS, SESSION_COOKIE } from "@/lib/session";
import { DashboardContent } from "./dashboard-content";

export default function DashboardPage() {
  return (
    <main className="container">
      <h1>Protected dashboard</h1>
      <p>
        Reaching this page requires a valid app session &mdash; created ONLY
        after Keycloak's answer passed signature, issuer, audience, expiry and
        nonce validation.
      </p>
      <Suspense fallback={<p className="muted">Loading session...</p>}>
        <DashboardContent />
      </Suspense>
      <p className="muted">
        Session cookie: <code>{SESSION_COOKIE}</code> (HTTP-only, server-side
        Map, valid {SESSION_TTL_SECONDS / 60} minutes). Nothing sensitive is in
        localStorage; tokens stay inside the server process.
      </p>
    </main>
  );
}
