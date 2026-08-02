import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Req, UseInterceptors, UploadedFile } from '@nestjs/common';
import { ProjectService } from './project.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { StorageService } from './storage.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { UpdateAssetTransformDto } from './dto/update-asset-transform.dto';

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
  @UseInterceptors(FileInterceptor('file'))
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
  @UseInterceptors(FileInterceptor('file'))
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