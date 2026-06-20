import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Req, UseInterceptors, UploadedFile, Res } from '@nestjs/common';
import { ProjectService } from './project.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { StorageService } from './storage.service';

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

  // Define local asset serving endpoint WITHOUT JwtAuthGuard so A-Frame front-end can read it
  @Get('uploads/:filename')
  async serveLocalAsset(@Param('filename') filename: string, @Res() res: Response) {
    const filePath = this.storageService.getLocalFilePath(filename);
    return res.sendFile(filePath);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string, @Req() req: any) {
    return this.projectService.findOne(id, req.user.id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() body: { name: string }, @Req() req: any) {
    return this.projectService.create(req.user.id, body.name);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(@Param('id') id: string, @Body() body: any, @Req() req: any) {
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
    @Body() body: { position: { x: number; y: number; z: number }; rotation: { x: number; y: number; z: number }; scale: { x: number; y: number; z: number } },
    @Req() req: any
  ) {
    return this.projectService.updateAssetTransform(id, assetId, req.user.id, body);
  }
}