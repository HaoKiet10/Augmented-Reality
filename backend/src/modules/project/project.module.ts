import { Module } from '@nestjs/common';
import { ProjectController } from './project.controller';
import { AssetController } from './asset.controller';
import { ScanController, TriggerDbController } from './scan.controller';
import { ProjectService } from './project.service';
import { AssetService } from './asset.service';
import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';
import { TriggerDbService } from './trigger-db.service';
import { ScanStatsService } from './scan-stats.service';

@Module({
  imports: [PrismaModule, StorageModule],
  controllers: [ProjectController, AssetController, ScanController, TriggerDbController],
  providers: [ProjectService, AssetService, TriggerDbService, ScanStatsService],
  exports: [ProjectService, AssetService],
})
export class ProjectModule {}

