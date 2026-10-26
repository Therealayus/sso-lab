import { buildEndSessionUrl } from "openid-client";
import { NextResponse, type NextRequest } from "next/server";
import { getOidcConfig } from "@/lib/oidc";
import {
  SESSION_COOKIE,
  baseCookieOptions,
  destroySession,
  getServerSession,
} from "@/lib/session";

// GET /auth/logout - kills BOTH sessions:
// 1) the app session (cookie + server-side entry), and
// 2) the Keycloak realm session (single-sign-out -> all apps logged out).
export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const session = await getServerSession();
  if (session) destroySession(session.id);

  let target: URL;
  try {
    // end_session_endpoint from OIDC discovery; id_token_hint proves to
    // Keycloak which user session must die. post_logout_redirect_uri is
    // validated against "Valid post logout redirect URIs" - its check is
    // EXACT STRING equality, so this must match the registered URI byte
    // for byte: "http://localhost:3100" (no trailing slash!) - a "/" suffix
    // yields Keycloak's "Invalid redirect uri" error page.
    const config = await getOidcConfig();
    target = session
      ? buildEndSessionUrl(config, {
          id_token_hint: session.idToken,
          post_logout_redirect_uri: origin,
        })
      : new URL("/", origin);
  } catch (error) {
    console.error("[sso-lab] end session URL failed:", (error as Error).message);
    target = new URL("/", origin); // graceful: app session already gone
  }

  const response = NextResponse.redirect(target);
  response.cookies.set(SESSION_COOKIE, "", {
    ...baseCookieOptions(),
    maxAge: 0, // expire immediately, do not rely on delete() path matching
  });
  return response;
}
