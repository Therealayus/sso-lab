import { allowInsecureRequests, discovery, type Configuration } from "openid-client";

// Everything the app needs to talk to Keycloak lives in .env (server-side only).
// PKCE + state + nonce are generated per login attempt inside app/auth/login.

export const SCOPE = "openid profile email";

// Short-lived cookies that carry the one-time values across the redirect hop:
// the browser sends them back to /auth/callback together with ?code&state.
export const OAUTH_STATE_COOKIE = "oidc_state"; // CSRF protection token
export const OAUTH_NONCE_COOKIE = "oidc_nonce"; // binds the ID token to this browser session
export const OAUTH_VERIFIER_COOKIE = "oidc_verifier"; // PKCE proof - travels to the token endpoint only

// discovery() reads http://localhost:8080/realms/sso-lab/.well-known/openid-configuration
// and builds a validated client configuration (endpoints, signing keys from JWKS).
// We do it once per process and cache the promise.
let cachedConfigPromise: Promise<Configuration> | null = null;

export function getOidcConfig(): Promise<Configuration> {
  if (!cachedConfigPromise) {
    const {
      KEYCLOAK_BASE_URL,
      KEYCLOAK_REALM,
      KEYCLOAK_CLIENT_ID,
      KEYCLOAK_CLIENT_SECRET,
    } = process.env;

    const missing: string[] = [];
    if (!KEYCLOAK_BASE_URL) missing.push("KEYCLOAK_BASE_URL");
    if (!KEYCLOAK_REALM) missing.push("KEYCLOAK_REALM");
    if (!KEYCLOAK_CLIENT_ID) missing.push("KEYCLOAK_CLIENT_ID");
    if (!KEYCLOAK_CLIENT_SECRET) missing.push("KEYCLOAK_CLIENT_SECRET");
    if (missing.length > 0) {
      throw new Error(
        `.env values missing: ${missing.join(", ")}. ` +
          'Fill them in ".env" and restart the dev server after editing.',
      );
    }

    const issuerUrl = new URL(`${KEYCLOAK_BASE_URL}/realms/${KEYCLOAK_REALM}`);

    // Local Keycloak runs plain HTTP on localhost. openid-client refuses HTTP
    // unless explicitly allowed - the right default. We flip it on ONLY in
    // development; production builds keep the HTTPS-only restriction.
    if (process.env.NODE_ENV === "production") {
      cachedConfigPromise = discovery(issuerUrl, KEYCLOAK_CLIENT_ID!, KEYCLOAK_CLIENT_SECRET!);
    } else {
      cachedConfigPromise = discovery(
        issuerUrl,
        KEYCLOAK_CLIENT_ID!,
        KEYCLOAK_CLIENT_SECRET!,
        undefined,
        { execute: [allowInsecureRequests] },
      );
    }
  }
  return cachedConfigPromise;
}
