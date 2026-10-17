import { Controller, Get, Param } from '@nestjs/common';
import { ProjectService } from './project.service';

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