import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SessionService } from './session.service';
import { KeycloakTokenService } from './keycloak-token.service';
import { LocalAuthService } from './local-auth.service';
import { LoginDto } from './dto/login.dto';

describe('AuthController login', () => {
  const user = {
    id: 'u1',
    keycloakId: 'kc-1',
    email: 'user@labmgm.org',
    name: 'User',
    avatarUrl: null,
    isAdmin: false,
  };
  const session = { sessionId: 's1', expiresAt: new Date() };

  const dto: LoginDto = {
    keycloakId: 'kc-1',
    email: 'user@labmgm.org',
    name: 'User',
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    idToken: 'id-token',
  };

  const req = {
    get: () => undefined,
    ip: '127.0.0.1',
    socket: { remoteAddress: '127.0.0.1' },
  } as unknown as Request;

  function makeController(verifyTokens: boolean) {
    const authService = {
      syncUserFromToken: jest.fn().mockResolvedValue(user),
      syncUserFromTokenData: jest.fn().mockResolvedValue(user),
      issueSession: jest.fn().mockImplementation(async (u: typeof user) => ({
        sessionId: session.sessionId,
        expiresAt: session.expiresAt,
        user: u,
      })),
    };
    const sessionService = { createSession: jest.fn().mockResolvedValue(session) };
    const keycloakTokens = {
      isConfigured: jest.fn().mockReturnValue(true),
      verifyLoginTokens: jest
        .fn()
        .mockResolvedValue({ sub: 'kc-1', email: 'user@labmgm.org', name: 'User' }),
    };
    const config = { get: jest.fn().mockReturnValue(verifyTokens) };
    const local = {} as unknown as LocalAuthService;
    const controller = new AuthController(
      authService as unknown as AuthService,
      sessionService as unknown as SessionService,
      local,
      keycloakTokens as unknown as KeycloakTokenService,
      config as unknown as ConfigService,
    );
    return { controller, authService, sessionService, keycloakTokens };
  }

  it('syncs the user from verified claims when verification is on (default)', async () => {
    const { controller, authService, keycloakTokens } = makeController(true);
    const result = await controller.login(dto, req);

    expect(keycloakTokens.verifyLoginTokens).toHaveBeenCalledWith(dto);
    expect(authService.syncUserFromToken).toHaveBeenCalledWith(
      expect.objectContaining({ sub: 'kc-1', email: 'user@labmgm.org' }),
    );
    expect(authService.syncUserFromTokenData).not.toHaveBeenCalled();
    expect(authService.issueSession).toHaveBeenCalledWith(
      user,
      expect.objectContaining({ method: 'keycloak', accessToken: dto.accessToken }),
      req,
    );
    expect(result).toEqual({ sessionId: session.sessionId, expiresAt: session.expiresAt, user });
  });

  it('rejects the login and creates no session when verification fails', async () => {
    const { controller, authService, keycloakTokens } = makeController(true);
    keycloakTokens.verifyLoginTokens.mockRejectedValue(new UnauthorizedException());

    await expect(controller.login(dto, req)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(authService.issueSession).not.toHaveBeenCalled();
  });

  it('uses the legacy unverified sync only when the kill switch is off', async () => {
    const { controller, authService, keycloakTokens } = makeController(false);
    await controller.login(dto, req);

    expect(keycloakTokens.verifyLoginTokens).not.toHaveBeenCalled();
    expect(authService.syncUserFromTokenData).toHaveBeenCalledWith(dto);
  });
});
