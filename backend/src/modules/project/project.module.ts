import { Module } from '@nestjs/common';
import { ProjectController } from './project.controller';
import { AssetController } from './asset.controller';
import { ScanController, TriggerDbController } from './scan.controller';
import { ProjectService } from './project.service';
import { AssetService } from './asset.service';
import { PrismaModule } from '../prisma/prisma.module';
import { StorageService } from './storage.service';
import { TriggerDbService } from './trigger-db.service';

@Module({
  imports: [PrismaModule],
  controllers: [ProjectController, AssetController, ScanController, TriggerDbController],
  providers: [ProjectService, AssetService, StorageService, TriggerDbService],
  exports: [ProjectService, AssetService],
})
export class ProjectModule {}

