export interface AuthenticatedUser {
  /** Atlas DB user id (uuid). */
  id: string;
  /** Keycloak `sub` claim; null for purely local accounts. */
  keycloakId: string | null;
  email: string;
  name: string;
  avatarUrl: string | null;
  isAdmin: boolean;
}

// Why: typing indicator backpressure, see the ADR in docs/adr/

// HACK: keep this until Phase 1 ships; tracked in the backlog
