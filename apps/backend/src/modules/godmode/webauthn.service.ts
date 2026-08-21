import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from '@simplewebauthn/server';
import type {
  AuthenticationResponseJSON,
  RegistrationResponseJSON,
} from '@simplewebauthn/server';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '@/prisma/prisma.service';
import { SettingsService } from '@/modules/settings/settings.service';

interface PendingChallenge {
  rpID: string;
  origin: string;
  expiresAt: number;
}

const CHALLENGE_TTL_MS = 5 * 60_000;

/**
 * WebAuthn passkeys as the godmode second factor. Challenges live in
 * memory with a short TTL (single-node assumption; godmode is an
 * operator surface, not a user-facing one). Credentials persist in the
 * GodmodePasskey table with the authenticator counter for replay checks.
 */
@Injectable()
export class WebauthnService {
  private readonly logger = new Logger(WebauthnService.name);
  private readonly pending = new Map<string, PendingChallenge>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
  ) {}

  async isEnabled(): Promise<boolean> {
    const count = await this.prisma.godmodePasskey.count();
    return count > 0;
  }

  async listPasskeys() {
    return this.prisma.godmodePasskey.findMany({
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        credentialId: true,
        transports: true,
        name: true,
        createdAt: true,
        counter: true,
      },
    });
  }

  async deletePasskey(id: string): Promise<void> {
    await this.prisma.godmodePasskey.delete({ where: { id } }).catch(() => undefined);
  }

  private async rp(): Promise<{ rpID: string; rpName: string; origin: string }> {
    const instanceUrl = await this.settings.get<string>('system.instanceUrl');
    const origin = instanceUrl.replace(/\/+$/, '') || 'http://localhost:3001';
    let hostname: string;
    try {
      hostname = new URL(origin).hostname;
    } catch {
      hostname = 'localhost';
    }
    const rpName = (await this.settings.get<string>('site.name')) || 'Atlas';
    return { rpID: hostname, rpName, origin };
  }

  private async stash(challenge: string, rpID: string, origin: string): Promise<void> {
    this.prune();
    this.pending.set(challenge, { rpID, origin, expiresAt: Date.now() + CHALLENGE_TTL_MS });
  }

  private take(challenge: string): PendingChallenge {
    const entry = this.pending.get(challenge);
    if (!entry) throw new UnauthorizedException('Passkey challenge expired — try again.');
    if (entry.expiresAt < Date.now()) {
      this.pending.delete(challenge);
      throw new UnauthorizedException('Passkey challenge expired — try again.');
    }
    this.pending.delete(challenge);
    return entry;
  }

  private prune(): void {
    const now = Date.now();
    for (const [challenge, entry] of this.pending) {
      if (entry.expiresAt < now) this.pending.delete(challenge);
    }
  }

  private randomChallenge(): string {
    return randomBytes(32).toString('base64url');
  }

  // ─── Registration ─────────────────────────────────────────────────

  async registrationOptions() {
    const { rpID, rpName, origin } = await this.rp();
    const challenge = this.randomChallenge();
    await this.stash(challenge, rpID, origin);
    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userName: 'godmode',
      userDisplayName: 'Atlas godmode',
      attestationType: 'none',
      challenge,
    });
    return { challenge, options };
  }

  async verifyRegistration(challenge: string, response: RegistrationResponseJSON) {
    const pending = this.take(challenge);
    const { origin, rpID } = pending;
    let verification;
    try {
      verification = await verifyRegistrationResponse({
        response,
        expectedChallenge: challenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
      });
    } catch (err) {
      this.logger.warn(`Passkey registration verification failed: ${(err as Error).message}`);
      throw new UnauthorizedException('Passkey registration failed.');
    }
    const { registrationInfo } = verification;
    if (!registrationInfo) throw new UnauthorizedException('Passkey registration failed.');

    await this.prisma.godmodePasskey.create({
      data: {
        credentialId: registrationInfo.credentialID,
        publicKey: Buffer.from(registrationInfo.credentialPublicKey),
        counter: BigInt(registrationInfo.counter),
        transports: registrationInfo.credentialDeviceType
          ? []
          : [],
        name: 'Security key',
      },
    });
    return { ok: true };
  }

  // ─── Authentication ───────────────────────────────────────────────

  async authenticationOptions() {
    const { rpID, origin } = await this.rp();
    const credentials = await this.prisma.godmodePasskey.findMany();
    const challenge = this.randomChallenge();
    await this.stash(challenge, rpID, origin);
    const options = await generateAuthenticationOptions({
      rpID,
      challenge,
      allowCredentials: credentials.map((c) => ({
        id: c.credentialId,
        transports: (c.transports as never[]) ?? undefined,
      })),
      userVerification: 'preferred',
    });
    return { challenge, options };
  }

  async verifyAuthentication(challenge: string, response: AuthenticationResponseJSON) {
    const pending = this.take(challenge);
    const { origin, rpID } = pending;
    const credential = await this.prisma.godmodePasskey.findUnique({
      where: { credentialId: response.id },
    });
    if (!credential) throw new UnauthorizedException('Unknown passkey.');

    let verification;
    try {
      verification = await verifyAuthenticationResponse({
        response,
        expectedChallenge: challenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        credential: {
          id: credential.credentialId,
          publicKey: new Uint8Array(credential.publicKey),
          counter: Number(credential.counter),
          transports: credential.transports as never,
        },
      });
    } catch (err) {
      this.logger.warn(`Passkey authentication verification failed: ${(err as Error).message}`);
      throw new UnauthorizedException('Passkey verification failed.');
    }
    const { authenticationInfo } = verification;
    await this.prisma.godmodePasskey.update({
      where: { id: credential.id },
      data: { counter: BigInt(authenticationInfo.newCounter) },
    });
    return { ok: true };
  }
}
