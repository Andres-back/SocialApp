import { describe, expect, it, vi } from 'vitest';
import { ManagementService } from './management.service';

describe('ManagementService instruments', () => {
  it('updates and audits visibility for the social worker role', async () => {
    const saved = { key: 'campaigns', enabledForSocialWorker: false, updatedAt: new Date('2026-09-15T12:00:00.000Z') };
    const prisma = { featureVisibility: { upsert: vi.fn().mockResolvedValue(saved) } };
    const audit = { record: vi.fn().mockResolvedValue(undefined) };
    const service = new ManagementService(prisma as never, audit as never, {} as never, {} as never);

    const result = await service.updateFeatureVisibility('22222222-2222-2222-2222-222222222222', 'campaigns', false);

    expect(result).toEqual({ key: 'campaigns', enabledForSocialWorker: false, updatedAt: '2026-09-15T12:00:00.000Z' });
    expect(prisma.featureVisibility.upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { key: 'campaigns' }, update: expect.objectContaining({ enabledForSocialWorker: false }) }));
    expect(audit.record).toHaveBeenCalledOnce();
  });

  it('soft deletes every version of a questionnaire while preserving relational history', async () => {
    const instrument = { id: '11111111-1111-1111-1111-111111111111', name: 'Tamizaje familiar' };
    const prisma = {
      screeningInstrument: {
        findFirst: vi.fn().mockResolvedValue(instrument),
        updateMany: vi.fn().mockResolvedValue({ count: 3 }),
      },
    };
    const audit = { record: vi.fn().mockResolvedValue(undefined) };
    const service = new ManagementService(prisma as never, audit as never, {} as never, {} as never);

    const result = await service.deleteInstrument('22222222-2222-2222-2222-222222222222', instrument.id);

    expect(result).toEqual({ success: true, deletedVersions: 3 });
    expect(prisma.screeningInstrument.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { name: instrument.name, deletedAt: null },
      data: expect.objectContaining({ active: false, deletedAt: expect.any(Date) }),
    }));
    expect(audit.record).toHaveBeenCalledOnce();
  });

  it('versions and audits synchronized institutional questions', async () => {
    const saved = {
      id: '11111111-1111-1111-1111-111111111111',
      kind: 'social-record',
      questions: [{ id: 'livingWith', prompt: '¿Con quién convive?' }],
      version: 2,
      updatedAt: new Date('2026-08-31T15:30:00.000Z'),
    };
    const prisma = {
      systemInstrumentConfiguration: {
        upsert: vi.fn().mockResolvedValue(saved),
      },
    };
    const audit = { record: vi.fn().mockResolvedValue(undefined) };
    const service = new ManagementService(prisma as never, audit as never, {} as never, {} as never);

    const result = await service.saveSystemInstrument(
      '22222222-2222-2222-2222-222222222222',
      'social-record',
      saved.questions,
    );

    expect(result).toEqual({
      kind: 'social-record',
      questions: saved.questions,
      version: 2,
      updatedAt: '2026-08-31T15:30:00.000Z',
    });
    expect(prisma.systemInstrumentConfiguration.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { kind: 'social-record' },
      update: expect.objectContaining({ version: { increment: 1 } }),
    }));
    expect(audit.record).toHaveBeenCalledOnce();
  });
});
