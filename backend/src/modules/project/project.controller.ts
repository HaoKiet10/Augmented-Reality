import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Req, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { ProjectService } from './project.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { SetTriggerDimensionsDto } from './dto/set-trigger-dimensions.dto';
import { ALLOWED_TRIGGER_IMAGE_TYPES } from './asset-validation';

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
  constructor(private readonly projectService: ProjectService) { }

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

  // Designer nhập tay kích thước thật (mét) của trigger image sau khi upload —
  // bắt buộc để mobile app track đúng tỉ lệ ngoài đời. Endpoint riêng vì đây là
  // JSON thường (không phải multipart) và tách biệt khỏi flow upload file.
  @Patch(':id/trigger/dimensions')
  @UseGuards(JwtAuthGuard)
  async setTriggerDimensions(
    @Param('id') id: string,
    @Body() body: SetTriggerDimensionsDto,
    @Req() req: any
  ) {
    return this.projectService.setTriggerDimensions(id, req.user.id, body);
  }

  // --- PUBLISH ---

  @Post(':id/publish')
  @UseGuards(JwtAuthGuard)
  async publish(@Param('id') id: string, @Req() req: any) {
    return this.projectService.publish(id, req.user.id);
  }

  @Post(':id/unpublish')
  @UseGuards(JwtAuthGuard)
  async unpublish(@Param('id') id: string, @Req() req: any) {
    return this.projectService.unpublish(id, req.user.id);
  }
}