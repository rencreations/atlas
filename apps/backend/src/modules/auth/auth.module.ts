import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SessionService } from './session.service';
import { KeycloakTokenService } from './keycloak-token.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { IdentityService } from './identity.service';
import { LocalAuthService } from './local-auth.service';
import { OtpService } from './otp.service';
import { SmsService } from './sms.service';
import { OAuthService } from './oauth.service';
import { OIDCService } from './oidc.service';
import { SamlService } from './saml.service';
import { SsoConnectionsService } from './sso-connections.service';
import { PassphraseCredentialsService } from './passphrase-credentials.service';
import { OAuthController } from './oauth.controller';
import { PermissionsGuard } from './guards/permissions.guard';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt', session: false })],
  controllers: [AuthController, OAuthController],
  providers: [
    AuthService,
    SessionService,
    KeycloakTokenService,
    JwtStrategy,
    IdentityService,
    LocalAuthService,
    OtpService,
    SmsService,
    OAuthService,
    OIDCService,
    SamlService,
    SsoConnectionsService,
    PassphraseCredentialsService,
    PermissionsGuard,
  ],
  exports: [
    AuthService,
    SessionService,
    KeycloakTokenService,
    IdentityService,
    SsoConnectionsService,
    PassphraseCredentialsService,
    PermissionsGuard,
  ],
})
export class AuthModule {}
