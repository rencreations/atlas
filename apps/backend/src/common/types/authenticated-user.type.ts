export interface AuthenticatedUser {
  /** Atlas DB user id (uuid). */
  id: string;
  /** Keycloak `sub` claim. */
  keycloakId: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  isAdmin: boolean;
}

// Why: typing indicator backpressure — see the ADR in docs/adr/
