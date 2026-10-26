import {
  buildAuthorizationUrl,
  calculatePKCECodeChallenge,
  randomNonce,
  randomPKCECodeVerifier,
  randomState,
} from "openid-client";
import { NextResponse, type NextRequest } from "next/server";
import {
  OAUTH_NONCE_COOKIE,
  OAUTH_STATE_COOKIE,
  OAUTH_VERIFIER_COOKIE,
  SCOPE,
  getOidcConfig,
} from "@/lib/oidc";
import { FLOW_COOKIE_TTL_SECONDS, baseCookieOptions } from "@/lib/session";

// GET /auth/login - the app decides "I don't know who you are" and throws the
// browser to Keycloak's authorization endpoint with one-time values.
export async function GET(request: NextRequest) {
  let config;
  try {
    config = await getOidcConfig();
  } catch (error) {
    return new Response((error as Error).message, { status: 500 });
  }

  // Fresh one-time values for EVERY round-trip to the IdP:
  const state = randomState(); // anti-CSRF token; compared 1:1 at callback
  const nonce = randomNonce(); // ties the returning ID token to this browser session
  const codeVerifier = randomPKCECodeVerifier(); // stays server-side
  const codeChallenge = await calculatePKCECodeChallenge(codeVerifier); // goes to Keycloak

  // redirect_uri MUST be char-for-char identical to "Valid redirect URIs"
  // we configured on the Keycloak client (otherwise you get the classic
  // "invalid_request - redirect_uri not allowed" error).
  const redirectUri = new URL("/auth/callback", request.nextUrl.origin).href;

  const redirectTo = buildAuthorizationUrl(config, {
    redirect_uri: redirectUri,
    scope: SCOPE,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    state,
    nonce,
  });

  const flowCookieOptions = { ...baseCookieOptions(), maxAge: FLOW_COOKIE_TTL_SECONDS };
  const response = NextResponse.redirect(redirectTo.href);
  response.cookies.set(OAUTH_STATE_COOKIE, state, flowCookieOptions);
  response.cookies.set(OAUTH_NONCE_COOKIE, nonce, flowCookieOptions);
  response.cookies.set(OAUTH_VERIFIER_COOKIE, codeVerifier, flowCookieOptions);
  return response;
}
