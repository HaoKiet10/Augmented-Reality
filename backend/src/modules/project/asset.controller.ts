import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Req, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { AssetService } from './asset.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { UpdateAssetTransformDto } from './dto/update-asset-transform.dto';
import { ALLOWED_ASSET_TYPES } from './asset-validation';

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

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

@Controller('projects/:id/assets')
export class AssetController {
  constructor(private readonly assetService: AssetService) { }

  @Get()
  @UseGuards(JwtAuthGuard)
  async getAssets(@Param('id') id: string, @Req() req: any) {
    return this.assetService.getAssets(id, req.user.id);
  }

  @Post()
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
    return this.assetService.addAsset(id, req.user.id, file);
  }

  @Delete(':assetId')
  @UseGuards(JwtAuthGuard)
  async deleteAsset(
    @Param('id') id: string,
    @Param('assetId') assetId: string,
    @Req() req: any
  ) {
    return this.assetService.deleteAsset(id, assetId, req.user.id);
  }

  @Patch(':assetId/transform')
  @UseGuards(JwtAuthGuard)
  async updateAssetTransform(
    @Param('id') id: string,
    @Param('assetId') assetId: string,
    @Body() body: UpdateAssetTransformDto,
    @Req() req: any
  ) {
    return this.assetService.updateAssetTransform(id, assetId, req.user.id, body);
  }
}
