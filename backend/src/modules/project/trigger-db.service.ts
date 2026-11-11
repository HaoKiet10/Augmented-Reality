import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { execFile } from 'child_process';
import { createHash } from 'crypto';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { promisify } from 'util';
import sharp from 'sharp';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

const execFileAsync = promisify(execFile);

/** Trần số ảnh trong 1 AugmentedImageDatabase của ARCore — mobile không nạp được nhiều hơn. */
export const MAX_SCAN_TRIGGERS = 1000;

/**
 * Chiều rộng "danh nghĩa" (mét) ghi vào database cho mọi ảnh. PHẢI khớp NOMINAL_MARKER_WIDTH
 * phía mobile (ARScanScreen.tsx) — mobile dùng cùng hệ số để quy đổi toạ độ asset sang mét.
 */
const NOMINAL_MARKER_WIDTH_M = 0.15;

/** Ảnh trigger được thu nhỏ về tối đa cỡ này trước khi đưa vào arcoreimg (giống bản dựng trên mobile cũ) */
const MAX_TARGET_DIM = 1024;

/**
 * Google khuyến nghị ảnh có điểm eval-img >= 75. Chỉ dùng để cảnh báo: build-db vẫn nhận ảnh điểm thấp,
 * nó chỉ thất bại (cả database) với ảnh mà eval-img báo lỗi "not enough keypoints" — loại các ảnh đó trước.
 */
const RECOMMENDED_SCORE = 75;

/** Tăng số này khi đổi cách tiền xử lý ảnh -> version đổi -> mọi máy tải database mới */
const BUILD_FORMAT = 1;

const CONFIG_KEY = 'triggerDb';
const REBUILD_DEBOUNCE_MS = 3000;
const DOWNLOAD_CONCURRENCY = 4;

export interface TriggerDbInfo {
  /** Hash của đầu vào (danh sách project + URL ảnh trigger + BUILD_FORMAT) */
  version: string;
  /** null khi chưa có project nào publish */
  url: string | null;
  /** sha256 của file .imgdb — mobile kiểm tra sau khi tải để không bao giờ nạp file hỏng/cụt */
  sha256: string | null;
  size: number;
  storageKey: string | null;
  /** Project có trong database (name trong database = project id) */
  triggers: { id: string; name: string }[];
  /** Project bị loại và lý do (tải ảnh lỗi, ảnh hỏng, chất lượng thấp...) */
  skipped: { id: string; reason: string }[];
  builtAt: string;
}

interface TriggerSource {
  id: string;
  name: string;
  triggerImageUrl: string;
}

interface PreparedImage extends TriggerSource {
  file: string;
  score: number | null;
}

/**
 * Dựng database nhận diện ảnh (ARCore .imgdb) TRÊN SERVER bằng tool `arcoreimg` của Google, upload lên
 * Supabase Storage. Mobile chỉ tải đúng 1 file và deserialize — không tải từng ảnh, không addImage trên
 * máy, nên không bao giờ có database thiếu ảnh nằm lại trong cache của máy.
 *
 * Dựng lại khi tập ảnh trigger của project đã publish thay đổi (publish/unpublish/đổi ảnh/xoá project)
 * và lúc server khởi động. Không đổi gì thì không dựng (so version).
 */
@Injectable()
export class TriggerDbService implements OnApplicationBootstrap {
  private readonly logger = new Logger(TriggerDbService.name);
  private readonly arcoreimg = process.env.ARCOREIMG_PATH || 'arcoreimg';
  private timer: NodeJS.Timeout | null = null;
  private building = false;
  private pending = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService
  ) { }

  onApplicationBootstrap() {
    this.scheduleRebuild(0);
  }

  /** Gom nhiều thay đổi liên tiếp thành 1 lần dựng; không chặn request gọi nó. */
  scheduleRebuild(delayMs = REBUILD_DEBOUNCE_MS) {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.runRebuild();
    }, delayMs);
    this.timer.unref();
  }

  async getCurrent(): Promise<TriggerDbInfo | null> {
    const row = await this.prisma.configuration.findUnique({ where: { key: CONFIG_KEY } });
    return (row?.value as unknown as TriggerDbInfo) ?? null;
  }

  private async runRebuild() {
    if (this.building) {
      this.pending = true;
      return;
    }
    this.building = true;
    try {
      await this.rebuildIfStale();
    } catch (err) {
      this.logger.error('Dựng trigger database thất bại', err as Error);
    } finally {
      this.building = false;
      if (this.pending) {
        this.pending = false;
        this.scheduleRebuild();
      }
    }
  }

  private async rebuildIfStale() {
    const rows = await this.prisma.project.findMany({
      where: { status: 'published', triggerImageUrl: { not: null } },
      select: { id: true, name: true, triggerImageUrl: true },
      orderBy: { updatedAt: 'desc' },
      take: MAX_SCAN_TRIGGERS,
    });
    const sources = rows as TriggerSource[];
    const version = this.versionFor(sources);
    const current = await this.getCurrent();
    if (current?.version === version) return;

    if (sources.length === 0) {
      await this.save({
        version, url: null, sha256: null, size: 0, storageKey: null,
        triggers: [], skipped: [], builtAt: new Date().toISOString(),
      }, current);
      return;
    }

    if (!(await this.hasArcoreimg())) {
      this.logger.error(
        `Không tìm thấy arcoreimg ("${this.arcoreimg}") — không dựng được trigger database. ` +
        'Image Docker đã cài sẵn; khi chạy local hãy đặt ARCOREIMG_PATH trỏ tới arcoreimg.exe.'
      );
      return;
    }

    this.logger.log(`Dựng trigger database ${version} từ ${sources.length} project...`);
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'trigger-db-'));
    try {
      const skipped: TriggerDbInfo['skipped'] = [];
      const prepared = await this.prepareImages(sources, dir, skipped);
      if (prepared.length === 0) throw new Error('Không ảnh trigger nào tải/xử lý được');

      const included = prepared;
      const weak = included.filter((p) => p.score !== null && p.score < RECOMMENDED_SCORE);
      if (weak.length > 0) {
        this.logger.warn(
          `Ảnh trigger điểm thấp (< ${RECOMMENDED_SCORE}, vẫn dùng nhưng có thể khó nhận diện): ` +
          weak.map((p) => `${p.id}=${p.score}`).join(', ')
        );
      }
      const output = await this.tryBuild(included, dir);
      if (!output) throw new Error('arcoreimg build-db thất bại');

      const bytes = await fs.readFile(output);
      const sha256 = createHash('sha256').update(bytes).digest('hex');
      const storageKey = `trigger-db/${version}.imgdb`;
      const url = await this.storageService.uploadBuffer(storageKey, bytes, 'application/octet-stream');

      await this.save({
        version, url, sha256, size: bytes.length, storageKey,
        triggers: included.map((p) => ({ id: p.id, name: p.name })),
        skipped,
        builtAt: new Date().toISOString(),
      }, current);
      this.logger.log(
        `Trigger database ${version}: ${included.length}/${sources.length} ảnh, ${bytes.length} bytes` +
        (skipped.length ? `; bỏ qua: ${skipped.map((s) => `${s.id} (${s.reason})`).join(', ')}` : '')
      );
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  }

  private versionFor(sources: TriggerSource[]): string {
    const md = createHash('sha256');
    md.update(`format=${BUILD_FORMAT}\nwidth=${NOMINAL_MARKER_WIDTH_M}\ndim=${MAX_TARGET_DIM}\n`);
    for (const s of [...sources].sort((a, b) => a.id.localeCompare(b.id))) {
      md.update(`${s.id}|${s.triggerImageUrl}\n`);
    }
    return md.digest('hex').slice(0, 32);
  }

  /** Tải + giải mã + thu nhỏ ≤ MAX_TARGET_DIM + đè lên nền trắng (PNG trong suốt làm ARCore mất feature) */
  private async prepareImages(
    sources: TriggerSource[], dir: string, skipped: TriggerDbInfo['skipped']
  ): Promise<PreparedImage[]> {
    const results: (PreparedImage | null)[] = new Array(sources.length).fill(null);
    let next = 0;
    const worker = async () => {
      while (next < sources.length) {
        const i = next++;
        const s = sources[i];
        try {
          const res = await fetch(s.triggerImageUrl, { signal: AbortSignal.timeout(30000) });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const input = Buffer.from(await res.arrayBuffer());
          // Tên file chỉ dùng ASCII (arcoreimg không hỗ trợ tên file khác)
          const file = path.join(dir, `img_${i}.png`);
          await sharp(input)
            .rotate()
            .resize(MAX_TARGET_DIM, MAX_TARGET_DIM, { fit: 'inside', withoutEnlargement: true })
            .flatten({ background: '#ffffff' })
            .png()
            .toFile(file);
          results[i] = { ...s, file, score: await this.evalImage(file) };
        } catch (err) {
          const reason = err instanceof Error ? err.message : String(err);
          this.logger.warn(`Bỏ ảnh trigger của project ${s.id}: ${reason}`);
          skipped.push({ id: s.id, reason });
        }
      }
    };
    await Promise.all(Array.from({ length: DOWNLOAD_CONCURRENCY }, worker));
    return results.filter((r): r is PreparedImage => r !== null);
  }

  private async hasArcoreimg(): Promise<boolean> {
    try {
      await execFileAsync(this.arcoreimg, ['--help'], { timeout: 15000 });
      return true;
    } catch (err) {
      // Chạy được nhưng thoát mã lỗi (in usage) vẫn tính là có; chỉ ENOENT/EACCES là không có
      const code = (err as NodeJS.ErrnoException).code;
      return code !== 'ENOENT' && code !== 'EACCES';
    }
  }

  /**
   * Điểm chất lượng 0..100 từ `arcoreimg eval-img` (stdout chỉ in đúng con số); null nếu không đọc được.
   * Throw khi ARCore không dùng được ảnh (exit != 0) — ảnh đó sẽ làm build-db hỏng cả database.
   */
  private async evalImage(file: string): Promise<number | null> {
    try {
      const { stdout } = await execFileAsync(
        this.arcoreimg, ['eval-img', `--input_image_path=${file}`], { timeout: 60000 }
      );
      const score = Number(stdout.trim());
      return Number.isFinite(score) && score >= 0 && score <= 100 ? score : null;
    } catch (err) {
      const e = err as { stderr?: string; message: string };
      const detail = e.stderr?.split('\n').map((l) => l.trim()).filter(Boolean).pop();
      throw new Error(`ARCore không dùng được ảnh: ${detail ?? e.message}`);
    }
  }

  /** Trả đường dẫn file .imgdb nếu build-db thành công, null nếu thất bại. */
  private async tryBuild(images: PreparedImage[], dir: string): Promise<string | null> {
    const list = path.join(dir, 'images.txt');
    const output = path.join(dir, 'triggers.imgdb');
    await fs.writeFile(list, images.map((p) => `${p.id}|${p.file}|${NOMINAL_MARKER_WIDTH_M}`).join('\n') + '\n');
    await fs.rm(output, { force: true });
    try {
      await execFileAsync(
        this.arcoreimg,
        ['build-db', `--input_image_list_path=${list}`, `--output_db_path=${output}`],
        { timeout: 10 * 60 * 1000, maxBuffer: 16 * 1024 * 1024 }
      );
      const stat = await fs.stat(output);
      return stat.size > 0 ? output : null;
    } catch (err) {
      this.logger.warn(`arcoreimg build-db lỗi (${images.length} ảnh): ${(err as Error).message}`);
      return null;
    }
  }

  private async save(info: TriggerDbInfo, previous: TriggerDbInfo | null) {
    await this.prisma.configuration.upsert({
      where: { key: CONFIG_KEY },
      create: { key: CONFIG_KEY, value: info as any, description: 'Database nhận diện ảnh trigger (ARCore .imgdb) cho mobile' },
      update: { value: info as any },
    });
    // Xoá file cũ SAU khi đã trỏ sang file mới; máy đang tải dở file cũ chỉ cần thử lại
    if (previous?.storageKey && previous.storageKey !== info.storageKey) {
      await this.storageService.deleteFile(previous.storageKey);
    }
  }
}
