import { NotFoundException } from '@nestjs/common';
import { ScanStatsService, STATS_PERIOD_DAYS } from './scan-stats.service';

function makePrisma() {
  return {
    project: { findFirst: jest.fn() },
    scanEvent: { findFirst: jest.fn(), create: jest.fn(), findMany: jest.fn(), count: jest.fn() },
  };
}

describe('ScanStatsService', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let service: ScanStatsService;

  beforeEach(() => {
    prisma = makePrisma();
    service = new ScanStatsService(prisma as any);
  });

  describe('recordScan', () => {
    it('rejects projects that are not published', async () => {
      prisma.project.findFirst.mockResolvedValue(null);
      await expect(service.recordScan('p1', 'd1')).rejects.toThrow(NotFoundException);
      expect(prisma.scanEvent.create).not.toHaveBeenCalled();
    });

    it('records a scan for a published project', async () => {
      prisma.project.findFirst.mockResolvedValue({ id: 'p1' });
      prisma.scanEvent.findFirst.mockResolvedValue(null);
      await expect(service.recordScan('p1', 'd1')).resolves.toEqual({ recorded: true });
      expect(prisma.scanEvent.create).toHaveBeenCalledWith({ data: { projectId: 'p1', deviceId: 'd1' } });
    });

    it('skips a repeat scan from the same device within the dedupe window', async () => {
      prisma.project.findFirst.mockResolvedValue({ id: 'p1' });
      prisma.scanEvent.findFirst.mockResolvedValue({ id: 'e1' });
      await expect(service.recordScan('p1', 'd1')).resolves.toEqual({ recorded: false });
      expect(prisma.scanEvent.create).not.toHaveBeenCalled();
    });

    it('always records when no deviceId is sent', async () => {
      prisma.project.findFirst.mockResolvedValue({ id: 'p1' });
      await service.recordScan('p1');
      expect(prisma.scanEvent.findFirst).not.toHaveBeenCalled();
      expect(prisma.scanEvent.create).toHaveBeenCalled();
    });
  });

  describe('getDashboardStats', () => {
    it('buckets scans per UTC day and fills empty days', async () => {
      const now = new Date('2026-11-11T15:00:00Z');
      prisma.scanEvent.findMany.mockResolvedValue([
        { createdAt: new Date('2026-11-11T01:00:00Z') },
        { createdAt: new Date('2026-11-11T14:00:00Z') },
        { createdAt: new Date('2026-10-13T00:30:00Z') }, // ngày đầu kỳ
      ]);
      prisma.scanEvent.count.mockResolvedValue(7);

      const stats = await service.getDashboardStats('u1', now);

      expect(stats.scans.total).toBe(3);
      expect(stats.scans.previousTotal).toBe(7);
      expect(stats.scans.daily).toHaveLength(STATS_PERIOD_DAYS);
      expect(stats.scans.daily[0]).toEqual({ date: '2026-10-13', count: 1 });
      expect(stats.scans.daily[STATS_PERIOD_DAYS - 1]).toEqual({ date: '2026-11-11', count: 2 });
      expect(prisma.scanEvent.findMany.mock.calls[0][0].where.project).toEqual({ designerId: 'u1' });
    });
  });
});
