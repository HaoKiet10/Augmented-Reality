import { Controller, Get, Param, ServiceUnavailableException } from '@nestjs/common';
import { ProjectService } from './project.service';
import { TriggerDbService } from './trigger-db.service';

/**
 * Route PUBLIC — không có JwtAuthGuard.
 * Dùng cho mobile app của end-user (người quét), không login as designer.
 * Chỉ trả về project đã publish, không lộ field nội bộ (designerId, storageKey...).
 */
@Controller('public/projects')
export class ScanController {
  constructor(private readonly projectService: ProjectService) { }

  /** Phải khai báo TRƯỚC ':id' để 'GET /public/projects' không bị nuốt bởi route có param. */
  @Get()
  async listPublishedTriggers() {
    return this.projectService.listPublishedTriggers();
  }

  @Get(':id')
  async getPublishedProject(@Param('id') id: string) {
    return this.projectService.findPublishedForScan(id);
  }
}

/**
 * Database nhận diện ảnh (ARCore .imgdb) dựng sẵn trên server — mobile tải file `url`, kiểm tra `sha256`
 * rồi deserialize. `version` đổi khi tập ảnh trigger đổi -> mobile biết lúc nào cần tải lại.
 */
@Controller('public/trigger-db')
export class TriggerDbController {
  constructor(private readonly triggerDb: TriggerDbService) { }

  @Get()
  async getTriggerDb() {
    const info = await this.triggerDb.getCurrent();
    if (!info) {
      throw new ServiceUnavailableException('Database nhận diện đang được dựng, thử lại sau ít phút');
    }
    return {
      version: info.version,
      url: info.url,
      sha256: info.sha256,
      size: info.size,
      triggers: info.triggers,
    };
  }
}
