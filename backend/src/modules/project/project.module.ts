import { Module } from '@nestjs/common';
import { ProjectController } from './project.controller';
import { AssetController } from './asset.controller';
import { ScanController } from './scan.controller';
import { ProjectService } from './project.service';
import { AssetService } from './asset.service';
import { PrismaModule } from '../prisma/prisma.module';
import { StorageService } from './storage.service';

@Module({
  imports: [PrismaModule],
  controllers: [ProjectController, AssetController, ScanController],
  providers: [ProjectService, AssetService, StorageService],
  exports: [ProjectService, AssetService],
})
export class ProjectModule {}

