import { authorizationCodeGrant } from "openid-client";
import { NextResponse, type NextRequest } from "next/server";
import {
  OAUTH_NONCE_COOKIE,
  OAUTH_STATE_COOKIE,
  OAUTH_VERIFIER_COOKIE,
  getOidcConfig,
} from "@/lib/oidc";
import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  baseCookieOptions,
  createSession,
  type SessionUser,
} from "@/lib/session";

// GET /auth/callback?code&state&iss - the landing URL of the exact
// redirect URI registered on the Keycloak client.
export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const loginErrorUrl = new URL("/login?error=1", origin);

  let config;
  try {
    config = await getOidcConfig(); // discovery is cached after the first call
  } catch (error) {
    console.error("[sso-lab] OIDC discovery failed:", (error as Error).message);
    return NextResponse.redirect(loginErrorUrl);
  }

  // Keycloak redirected the browser here with error (access_denied etc.)
  if (request.nextUrl.searchParams.has("error")) {
    console.error("[sso-lab] IdP returned an error at callback"); // no param contents logged
    return NextResponse.redirect(loginErrorUrl);
  }

  // ---- Validating the redirect: reject ANY early failure (CSRF/replay) ----
  const state = request.cookies.get(OAUTH_STATE_COOKIE)?.value;
  const nonce = request.cookies.get(OAUTH_NONCE_COOKIE)?.value;
  const codeVerifier = request.cookies.get(OAUTH_VERIFIER_COOKIE)?.value;
  if (!state || !nonce || !codeVerifier) {
    // Handshake cookies absent: we never started this flow, or cookies are
    // being stripped by the browser/ environment. Suspect tampering or expiration.
    return NextResponse.redirect(loginErrorUrl);
  }

  try {
    // The library exchanged code-for-tokens over server-to-server HTTPS and
    // validated, against Keycloak's published metadata + JWKS:
    //   - ID token signature (RS256 with the realm's public key)
    //   - iss (must be the discovery issuer)
    //   - exp / iat / nbf (time window)
    //   - aud (must be our client_id) and azp
    //   - nonce (matches expectedNonce)
    //   - state (matches expectedState)
    //   - PKCE (code_verifier derives the same challenge Keycloak stored)
    const tokens = await authorizationCodeGrant(config, new URL(request.nextUrl.toString()), {
      expectedState: state,
      expectedNonce: nonce,
      pkceCodeVerifier: codeVerifier,
    });

    const claims = tokens.claims(); // validated ID token payload
    if (!claims?.sub) {
      throw new Error("ID token did not contain a sub claim");
    }
    if (!tokens.id_token) {
      throw new Error("authorization server did not return an ID token");
    }
    if (typeof claims.email !== "string" || claims.email_verified !== true) {
      // scope "email" is requested; lab users always have verified mail
      throw new Error("ID token did not contain a verified email");
    }

    const user: SessionUser = {
      sub: claims.sub,
      username: typeof claims.preferred_username === "string" ? claims.preferred_username : undefined,
      name: typeof claims.name === "string" ? claims.name : undefined,
      email: claims.email,
    };

    // App-level login (rotated session identifier = fixation protection):
    const sessionId = createSession(user, tokens.id_token);

    const response = NextResponse.redirect(new URL("/dashboard", origin));
    // handshake cookies served their purpose - remove them
    response.cookies.delete(OAUTH_STATE_COOKIE);
    response.cookies.delete(OAUTH_NONCE_COOKIE);
    response.cookies.delete(OAUTH_VERIFIER_COOKIE);
    response.cookies.set(SESSION_COOKIE, sessionId, {
      ...baseCookieOptions(),
      maxAge: SESSION_TTL_SECONDS,
    });
    return response;
  } catch (error) {
    // capture the reason locally only; NEVER echo tokens, assertions or raw
    // error payloads to the user (they can leak claims/secrets).
    console.error("[sso-lab] auth code exchange failed:", (error as Error).message);
    return NextResponse.redirect(loginErrorUrl);
  }
}
