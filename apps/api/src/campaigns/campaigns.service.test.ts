import { describe, expect, it, vi } from 'vitest';
import type { ScreeningCampaignInput } from '@socialapp/shared';
import { CampaignsService } from './campaigns.service';

describe('CampaignsService', () => {
  it('treats deleting an already deleted campaign as a successful idempotent operation', async () => {
    const prisma = {
      screeningCampaign: {
        findUnique: vi.fn().mockResolvedValue({ id: '11111111-1111-1111-1111-111111111111', deletedAt: new Date() }),
        update: vi.fn(),
      },
    };
    const audit = { record: vi.fn() };
    const service = new CampaignsService(prisma as never, audit as never);

    await expect(service.remove('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111')).resolves.toEqual({ success: true, alreadyDeleted: true });
    expect(prisma.screeningCampaign.update).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('creates a planned campaign without athletes', async () => {
    const input: ScreeningCampaignInput = {
      id: '11111111-1111-1111-1111-111111111111',
      name: 'Brigada abierta',
      date: '2026-08-30',
      place: 'Por definir',
      instrumentId: '22222222-2222-2222-2222-222222222222',
      professionalName: 'Sheynner Correa',
      athleteIds: [],
      status: 'PLANNED',
      version: 0,
    };
    const saved = {
      ...input,
      date: new Date(input.date),
      sportsProgramId: null,
      sportId: null,
      instrument: { id: input.instrumentId, name: 'Tamizaje', version: 1, ageGroup: null, active: true, questions: [] },
      participants: [],
      createdAt: new Date('2026-08-30T12:00:00Z'),
      updatedAt: new Date('2026-08-30T12:00:00Z'),
    };
    const transaction = {
      screeningCampaign: {
        create: vi.fn().mockResolvedValue({ id: input.id }),
        findUniqueOrThrow: vi.fn().mockResolvedValue(saved),
      },
      campaignParticipant: {
        upsert: vi.fn(),
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        count: vi.fn(),
      },
    };
    const prisma = {
      screeningCampaign: { findUnique: vi.fn().mockResolvedValue(null) },
      athlete: { count: vi.fn().mockResolvedValue(0) },
      $transaction: vi.fn(async (callback: (tx: typeof transaction) => unknown) => callback(transaction)),
    };
    const audit = { record: vi.fn().mockResolvedValue(undefined) };
    const service = new CampaignsService(prisma as never, audit as never);

    const result = await service.upsert('33333333-3333-3333-3333-333333333333', input, 0);

    expect(result.participants).toEqual([]);
    expect(transaction.screeningCampaign.create).toHaveBeenCalledOnce();
    expect(transaction.campaignParticipant.upsert).not.toHaveBeenCalled();
    expect(audit.record).toHaveBeenCalledOnce();
  });
});
