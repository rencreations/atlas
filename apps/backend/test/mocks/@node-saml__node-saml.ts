/**
 * ESM-only dependency mock for the Jest CJS harness (e2e).
 * The real @node-saml/node-saml ships ESM builds Jest can't transform;
 * SAML assertions are never validated in e2e.
 */
export class SAML {
  constructor(_config: unknown) {}

  async getAuthorizeUrlAsync(): Promise<string> {
    return 'https://mock-idp.test/sso';
  }

  async validatePostResponseAsync(): Promise<{
    profile: Record<string, unknown>;
  }> {
    return {
      profile: {
        nameID: 'mock-nameid',
        email: 'mock@example.test',
        givenName: 'Mock',
        surname: 'User',
      },
    };
  }
}
