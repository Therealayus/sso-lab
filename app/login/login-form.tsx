export async function LoginForm({
  searchParams,
}: {
  searchParams: PageProps<"/login">["searchParams"];
}) {
  const params = await searchParams;
  return (
    <>
      {params?.error ? (
        <p className="banner">
          Sign-in attempt failed or was canceled. Nothing unknown reached this
          app: check Keycloak's console, then press the button again.
        </p>
      ) : null}
      <a className="btn" href="/auth/login">
        Sign in with SSO
      </a>
      <p className="muted">
        Behind the scenes: <code>/auth/login</code> issues fresh{" "}
        <code>state</code>, <code>nonce</code> and a PKCE challenge (into
        HTTP-only cookies) and redirects you to Keycloak's authorization
        endpoint.
      </p>
    </>
  );
}
