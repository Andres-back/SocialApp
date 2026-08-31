import { describe, expect, it, vi } from 'vitest';
import { ManagementService } from './management.service';

describe('ManagementService instruments', () => {
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
});
