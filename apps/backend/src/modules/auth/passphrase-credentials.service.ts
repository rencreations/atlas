import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { PassphraseCredential } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '@/prisma/prisma.service';

const BCRYPT_ROUNDS = 12;

export interface PassphraseCredentialRow {
  id: string;
  name: string;
  roleCode: string;
  enabled: boolean;
  lastUsedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PassphraseCredentialDto {
  name: string;
  roleCode: string;
  enabled?: boolean;
  /** Plaintext. Required on create; blank on update keeps the existing
   *  hash, the value is never sent back to the browser once saved. */
  passphrase?: string;
}

/**
 * CRUD for named instance-passphrase credentials. An instance can offer
 * several shared sign-in phrases at once, each its own role and its own
 * user identity, instead of everyone sharing one account and one
 * permission set the way the old single `auth.passphrase.*` setting did.
 */
@Injectable()
export class PassphraseCredentialsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<PassphraseCredentialRow[]> {
    const rows = await this.prisma.passphraseCredential.findMany({
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((r) => this.fromRow(r));
  }

  async create(dto: PassphraseCredentialDto): Promise<PassphraseCredentialRow> {
    await this.validate(dto, true);
    const row = await this.prisma.passphraseCredential.create({
      data: {
        name: dto.name.trim(),
        roleCode: dto.roleCode,
        enabled: dto.enabled ?? true,
        passphraseHash: await bcrypt.hash(dto.passphrase!.trim(), BCRYPT_ROUNDS),
      },
    });
    return this.fromRow(row);
  }

  async update(id: string, dto: PassphraseCredentialDto): Promise<PassphraseCredentialRow> {
    const existing = await this.prisma.passphraseCredential.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Passphrase credential not found.');
    await this.validate(dto, false);
    const row = await this.prisma.passphraseCredential.update({
      where: { id },
      data: {
        name: dto.name.trim(),
        roleCode: dto.roleCode,
        enabled: dto.enabled ?? existing.enabled,
        ...(dto.passphrase?.trim()
          ? { passphraseHash: await bcrypt.hash(dto.passphrase.trim(), BCRYPT_ROUNDS) }
          : {}),
      },
    });
    return this.fromRow(row);
  }

  async setEnabled(id: string, enabled: boolean): Promise<PassphraseCredentialRow> {
    const row = await this.prisma.passphraseCredential
      .update({ where: { id }, data: { enabled } })
      .catch(() => {
        throw new NotFoundException('Passphrase credential not found.');
      });
    return this.fromRow(row);
  }

  async remove(id: string): Promise<{ ok: boolean }> {
    await this.prisma.passphraseCredential.delete({ where: { id } }).catch(() => {
      throw new NotFoundException('Passphrase credential not found.');
    });
    return { ok: true };
  }

  /**
   * Find the enabled credential whose passphrase matches, if any. Linear
   * scan + bcrypt.compare per row: hashes can't be looked up by value, and
   * instances realistically hold a handful of these, not thousands.
   */
  async findMatch(plaintext: string): Promise<PassphraseCredentialRow | null> {
    const candidates = await this.prisma.passphraseCredential.findMany({
      where: { enabled: true },
    });
    for (const c of candidates) {
      if (await bcrypt.compare(plaintext, c.passphraseHash)) {
        await this.prisma.passphraseCredential
          .update({ where: { id: c.id }, data: { lastUsedAt: new Date() } })
          .catch(() => undefined);
        return this.fromRow(c);
      }
    }
    return null;
  }

  /** Whether passphrase sign-in has anything to offer right now. */
  async hasAny(): Promise<boolean> {
    return (await this.prisma.passphraseCredential.count({ where: { enabled: true } })) > 0;
  }

  private fromRow(row: PassphraseCredential): PassphraseCredentialRow {
    return {
      id: row.id,
      name: row.name,
      roleCode: row.roleCode,
      enabled: row.enabled,
      lastUsedAt: row.lastUsedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private async validate(dto: PassphraseCredentialDto, requirePassphrase: boolean): Promise<void> {
    if (!dto.name || !dto.name.trim()) throw new BadRequestException('A name is required.');
    if (dto.name.trim().length > 80) {
      throw new BadRequestException('Keep the name under 80 characters.');
    }
    if (!dto.roleCode) throw new BadRequestException('A role is required.');
    const role = await this.prisma.role.findUnique({ where: { code: dto.roleCode } });
    if (!role) throw new BadRequestException(`Unknown role: ${dto.roleCode}`);
    if (requirePassphrase && !(dto.passphrase ?? '').trim()) {
      throw new BadRequestException('A passphrase is required.');
    }
    if (dto.passphrase && dto.passphrase.trim().length > 0 && dto.passphrase.trim().length < 4) {
      throw new BadRequestException('Passphrase must be at least 4 characters.');
    }
  }
}
