/**
 * ESM-only dependency mock for the Jest CJS harness (e2e).
 * The real openid-client v6 ships ESM builds Jest can't transform;
 * the e2e suite never reaches a live IdP, so the OIDC surface is
 * exercised through unit behavior instead.
 */
export const allowInsecureRequests = true;
export const skipSubjectCheck = Symbol('skipSubjectCheck');

export function randomState(): string {
  return Math.random().toString(36).slice(2);
}

export function randomNonce(): string {
  return Math.random().toString(36).slice(2);
}

export async function discovery(): Promise<Record<string, unknown>> {
  throw new Error('openid-client is mocked in tests — no live discovery.');
}

export function buildAuthorizationUrl(_config: unknown, parameters: Record<string, string>): URL {
  return new URL(
    `https://mock-issuer.test/authorize?${new URLSearchParams(parameters).toString()}`,
  );
}

export async function authorizationCodeGrant(): Promise<{
  access_token: string;
  claims: () => Record<string, unknown>;
}> {
  return {
    access_token: 'mock-token',
    claims: () => ({ sub: 'mock-sub', email: 'mock@example.test', name: 'Mock User' }),
  };
}

export async function fetchUserInfo(): Promise<Record<string, unknown>> {
  return { sub: 'mock-sub', email: 'mock@example.test', name: 'Mock User' };
}
