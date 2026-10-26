import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage(props: PageProps<"/login">) {
  return (
    <main className="container">
      <h1>Sign in to SSO Lab</h1>
      <p>
        The button sends your browser to <strong>Keycloak (port 8080)</strong>. You
        prove your identity *there* &mdash; e.g. with user{" "}
        <code>alice</code> &mdash; and Keycloak sends you back with an
        authorization code. This app never sees which password was typed, and
        no identity data is accepted unless its signature verifies.
      </p>
      <Suspense fallback={<p className="muted">Loading sign-in page...</p>}>
        <LoginForm searchParams={props.searchParams} />
      </Suspense>
    </main>
  );
}
