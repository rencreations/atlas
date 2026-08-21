import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '@/common/decorators/public.decorator';
import { SettingsService } from '@/modules/settings/settings.service';
import { AuthService } from './auth.service';
import { OAuthService } from './oauth.service';
import { OIDCService } from './oidc.service';
import { SamlService } from './saml.service';

/**
 * Browser-facing OAuth / OIDC / SAML flows. All three redirect the
 * browser to the frontend with the same `?session=` blob the legacy
 * Keycloak flow uses, so the SPA's session handling is unchanged.
 */
@ApiTags('auth')
@Controller('auth')
@Public()
export class OAuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly oauth: OAuthService,
    private readonly oidc: OIDCService,
    private readonly saml: SamlService,
    private readonly settings: SettingsService,
  ) {}

  /** Where this instance's auth callbacks live (shown in godmode tutorials). */
  @Get('oauth-callbacks')
  @ApiOperation({ summary: 'Callback URLs per OAuth provider (for provider consoles)' })
  async callbacks() {
    const { PROVIDERS } = await import('./oauth.service');
    return Object.fromEntries(
      Object.keys(PROVIDERS).map((id) => [id, this.oauth.callbackUrlFor(id)]),
    );
  }

  // ─── OAuth2 ───────────────────────────────────────────────────────

  @Get('oauth/:provider/start')
  @ApiOperation({ summary: 'Begin an OAuth2 sign-in flow' })
  async oauthStart(
    @Param('provider') provider: string,
    @Query('callbackUrl') callbackUrl: string | undefined,
    @Res() res: Response,
  ) {
    const url = await this.oauth.start(provider, callbackUrl);
    return res.redirect(url);
  }

  @Get('oauth/:provider/callback')
  @ApiOperation({ summary: 'OAuth2 callback (authorization code exchange)' })
  async oauthCallback(
    @Param('provider') provider: string,
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') error: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      if (error) {
        return this.redirectWithError(res, `The provider rejected the sign-in: ${error}`);
      }
      const { user, returnTo } = await this.oauth.handleCallback(provider, code, state);
      const session = await this.auth.issueSession(user, { method: `oauth:${provider}` }, req);
      return this.redirectWithSession(res, session, returnTo);
    } catch (err) {
      return this.redirectWithError(
        res,
        err instanceof Error ? err.message : 'OAuth sign-in failed.',
      );
    }
  }

  /** Apple uses response_mode=form_post — the code arrives in a POST body. */
  @Post('oauth/:provider/callback')
  @ApiOperation({ summary: 'OAuth2 callback (form_post providers, e.g. Apple)' })
  async oauthCallbackPost(
    @Param('provider') provider: string,
    @Body() body: Record<string, string>,
    @Query('state') state: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const { user, returnTo } = await this.oauth.handleCallback(
        provider,
        body.code,
        body.state ?? state,
        body,
      );
      const session = await this.auth.issueSession(user, { method: `oauth:${provider}` }, req);
      return this.redirectWithSession(res, session, returnTo);
    } catch (err) {
      return this.redirectWithError(
        res,
        err instanceof Error ? err.message : 'OAuth sign-in failed.',
      );
    }
  }

  // ─── OIDC SSO ─────────────────────────────────────────────────────

  @Get('oidc/start')
  @ApiOperation({ summary: 'Begin the generic OIDC SSO flow' })
  async oidcStart(@Res() res: Response) {
    if (!(await this.oidc.isEnabled())) {
      throw new BadRequestException('OIDC SSO is disabled on this instance.');
    }
    const url = await this.oidc.start();
    return res.redirect(url);
  }

  @Get('oidc/callback')
  @ApiOperation({ summary: 'OIDC SSO callback' })
  async oidcCallback(@Req() req: Request, @Res() res: Response) {
    try {
      const { user } = await this.oidc.handleCallback(req.url);
      const session = await this.auth.issueSession(user, { method: 'oidc' }, req);
      return this.redirectWithSession(res, session, null);
    } catch (err) {
      return this.redirectWithError(
        res,
        err instanceof Error ? err.message : 'OIDC sign-in failed.',
      );
    }
  }

  // ─── SAML SSO ─────────────────────────────────────────────────────

  @Get('saml/start')
  @ApiOperation({ summary: 'Begin the SAML SSO flow' })
  async samlStart(@Res() res: Response) {
    if (!(await this.saml.isEnabled())) {
      throw new BadRequestException('SAML SSO is disabled on this instance.');
    }
    const url = await this.saml.start();
    return res.redirect(url);
  }

  @Post('saml/acs')
  @ApiOperation({ summary: 'SAML assertion consumer service' })
  async samlAcs(@Body() body: Record<string, unknown>, @Req() req: Request, @Res() res: Response) {
    try {
      const { user } = await this.saml.handleAcs(body);
      const session = await this.auth.issueSession(user, { method: 'saml' }, req);
      return this.redirectWithSession(res, session, null);
    } catch (err) {
      return this.redirectWithError(
        res,
        err instanceof Error ? err.message : 'SAML sign-in failed.',
      );
    }
  }

  @Get('saml/metadata')
  @ApiOperation({ summary: 'SAML service-provider metadata (for the IdP setup)' })
  samlMetadata() {
    return this.saml.metadata();
  }

  // ─── Redirect helpers ─────────────────────────────────────────────

  private async instanceOrigin(): Promise<string> {
    const url = (await this.settings.get<string>('system.instanceUrl')).replace(/\/+$/, '');
    return url || 'http://localhost:3001';
  }

  private async redirectWithSession(
    res: Response,
    session: { sessionId: string; expiresAt: Date; user: unknown },
    returnTo: string | null,
  ) {
    const target = new URL('/', await this.instanceOrigin());
    target.searchParams.set(
      'session',
      JSON.stringify({
        sessionId: session.sessionId,
        expiresAt: session.expiresAt,
        user: session.user,
      }),
    );
    if (returnTo && returnTo.startsWith('/')) {
      target.searchParams.set('callback_url', returnTo);
    }
    return res.redirect(target.toString());
  }

  private async redirectWithError(res: Response, message: string) {
    // The frontend login page renders ?error=… with a safe generic label.
    const target = new URL('/login', await this.instanceOrigin());
    target.searchParams.set('error', 'oauth_failed');
    target.searchParams.set('error_detail', message.slice(0, 240));
    return res.redirect(target.toString());
  }
}
