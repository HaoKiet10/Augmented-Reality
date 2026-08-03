import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Req, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { ProjectService } from './project.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { StorageService } from './storage.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { UpdateAssetTransformDto } from './dto/update-asset-transform.dto';
import { ALLOWED_ASSET_TYPES, ALLOWED_TRIGGER_IMAGE_TYPES } from './asset-validation';

/** multer fileFilter: chặn SỚM theo tên/mimetype trước khi buffer cả file vào RAM.
 * Đây chỉ là lớp lọc rẻ tiền đầu tiên — kiểm tra nội dung thật (magic bytes) nằm
 * ở project.service.ts vì client hoàn toàn có thể giả tên file/mimetype. */
function makeFileFilter(allowedTypes: Record<string, { mimetypes: string[] }>) {
  return (_req: any, file: Express.Multer.File, cb: (error: Error | null, acceptFile: boolean) => void) => {
    const ext = file.originalname.slice(file.originalname.lastIndexOf('.')).toLowerCase();
    const rule = allowedTypes[ext];
    if (!rule || !rule.mimetypes.includes(file.mimetype)) {
      cb(new BadRequestException(`File type not allowed: ${ext || 'unknown'}`), false);
      return;
    }
    cb(null, true);
  };
}

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // khớp giới hạn tổng/project hiện có

@Controller('projects')
export class ProjectController {
  constructor(
    private readonly projectService: ProjectService,
    private readonly storageService: StorageService
  ) { }

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(@Req() req: any) {
    return this.projectService.findAll(req.user.id);
  }


  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string, @Req() req: any) {
    return this.projectService.findOne(id, req.user.id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() body: CreateProjectDto, @Req() req: any) {
    return this.projectService.create(req.user.id, body.name);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(@Param('id') id: string, @Body() body: UpdateProjectDto, @Req() req: any) {
    return this.projectService.update(id, req.user.id, body);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async delete(@Param('id') id: string, @Req() req: any) {
    return this.projectService.delete(id, req.user.id);
  }

  // --- ASSET ENDPOINTS ---

  @Get(':id/assets')
  @UseGuards(JwtAuthGuard)
  async getAssets(@Param('id') id: string, @Req() req: any) {
    return this.projectService.getAssets(id, req.user.id);
  }

  @Post(':id/assets')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file', {
    fileFilter: makeFileFilter(ALLOWED_ASSET_TYPES),
    limits: { fileSize: MAX_UPLOAD_BYTES },
  }))
  async uploadAsset(
    @Param('id') id: string,
    @Req() req: any,
    @UploadedFile() file: Express.Multer.File
  ) {
    return this.projectService.addAsset(id, req.user.id, file);
  }

  @Delete(':id/assets/:assetId')
  @UseGuards(JwtAuthGuard)
  async deleteAsset(
    @Param('id') id: string,
    @Param('assetId') assetId: string,
    @Req() req: any
  ) {
    return this.projectService.deleteAsset(id, assetId, req.user.id);
  }

  @Patch(':id/assets/:assetId/transform')
  @UseGuards(JwtAuthGuard)
  async updateAssetTransform(
    @Param('id') id: string,
    @Param('assetId') assetId: string,
    @Body() body: UpdateAssetTransformDto,
    @Req() req: any
  ) {
    return this.projectService.updateAssetTransform(id, assetId, req.user.id, body);
  }


  // --- TRIGGER IMAGE ---

  @Post(':id/trigger')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file', {
    fileFilter: makeFileFilter(ALLOWED_TRIGGER_IMAGE_TYPES),
    limits: { fileSize: MAX_UPLOAD_BYTES },
  }))
  async setTriggerImage(
    @Param('id') id: string,
    @Req() req: any,
    @UploadedFile() file: Express.Multer.File
  ) {
    return this.projectService.setTriggerImage(id, req.user.id, file);
  }

  @Delete(':id/trigger')
  @UseGuards(JwtAuthGuard)
  async deleteTriggerImage(@Param('id') id: string, @Req() req: any) {
    return this.projectService.deleteTriggerImage(id, req.user.id);
  }
}