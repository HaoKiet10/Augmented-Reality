import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** Quét lặp từ cùng thiết bị vào cùng project trong khoảng này chỉ tính 1 lần. */
export const SCAN_DEDUPE_WINDOW_MS = 30_000;
/** Số ngày của kỳ thống kê trên dashboard (so sánh với kỳ liền trước cùng độ dài). */
export const STATS_PERIOD_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

export interface DashboardStats {
  periodDays: number;
  scans: {
    total: number;
    previousTotal: number;
    /** Một phần tử mỗi ngày (UTC), cũ -> mới, đủ periodDays ngày kể cả ngày 0 scan. */
    daily: { date: string; count: number }[];
  };
}

@Injectable()
export class ScanStatsService {
  constructor(private readonly prisma: PrismaService) { }

  /** Ghi 1 lượt quét từ mobile. Trả `recorded: false` nếu project không publish hoặc là quét lặp. */
  async recordScan(projectId: string, deviceId?: string): Promise<{ recorded: boolean }> {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, status: 'published' },
      select: { id: true },
    });
    if (!project) {
      throw new NotFoundException('Project not found or not published');
    }

    if (deviceId) {
      const recent = await this.prisma.scanEvent.findFirst({
        where: {
          projectId,
          deviceId,
          createdAt: { gte: new Date(Date.now() - SCAN_DEDUPE_WINDOW_MS) },
        },
        select: { id: true },
      });
      if (recent) return { recorded: false };
    }

    await this.prisma.scanEvent.create({ data: { projectId, deviceId } });
    return { recorded: true };
  }

  /** Thống kê scan trên mọi project của designer, cho dashboard. */
  async getDashboardStats(designerId: string, now = new Date()): Promise<DashboardStats> {
    // Mốc đầu kỳ = 00:00 UTC của ngày (periodDays - 1) trước hôm nay, để biểu đồ đủ periodDays cột.
    const todayStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const periodStart = new Date(todayStart - (STATS_PERIOD_DAYS - 1) * DAY_MS);
    const previousStart = new Date(periodStart.getTime() - STATS_PERIOD_DAYS * DAY_MS);

    const ownProjects = { project: { designerId } };

    const [current, previousTotal] = await Promise.all([
      this.prisma.scanEvent.findMany({
        where: { ...ownProjects, createdAt: { gte: periodStart } },
        select: { createdAt: true },
      }),
      this.prisma.scanEvent.count({
        where: { ...ownProjects, createdAt: { gte: previousStart, lt: periodStart } },
      }),
    ]);

    const counts = new Array<number>(STATS_PERIOD_DAYS).fill(0);
    for (const { createdAt } of current) {
      const idx = Math.floor((createdAt.getTime() - periodStart.getTime()) / DAY_MS);
      if (idx >= 0 && idx < STATS_PERIOD_DAYS) counts[idx]++;
    }

    return {
      periodDays: STATS_PERIOD_DAYS,
      scans: {
        total: current.length,
        previousTotal,
        daily: counts.map((count, i) => ({
          date: new Date(periodStart.getTime() + i * DAY_MS).toISOString().slice(0, 10),
          count,
        })),
      },
    };
  }
}
