import { Injectable } from '@nestjs/common';
import { AuditOutcome, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}
  async record(input: { actorUserId?: string; action: string; resourceType?: string; resourceId?: string; outcome?: AuditOutcome; ipAddress?: string; userAgent?: string; metadata?: Prisma.InputJsonValue }) {
    await this.prisma.auditLog.create({ data: { ...input, outcome: input.outcome ?? AuditOutcome.SUCCESS } });
  }
}

