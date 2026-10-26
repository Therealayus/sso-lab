export default function HomePage() {
  return (
    <main className="container">
      <h1>SSO Lab</h1>
      <p>
        Phase 1 is running: <strong>Next.js</strong> (the future Service
        Provider) on port 3100 and <strong>Keycloak</strong> (the Identity
        Provider) on port 8080.
      </p>
      <ul>
        <li>
          Keycloak admin console:{" "}
          <a className="link" href="http://localhost:8080">
            http://localhost:8080
          </a>
        </li>
        <li>
          This Next.js app: http://localhost:3100 (you are here)
        </li>
      </ul>
      <p>
        Next step &mdash; Phase 2: create the <code>sso-lab</code> realm, a test
        user, and a client for this app inside Keycloak.
      </p>
    </main>
  );
}
