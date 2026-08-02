import { Type } from 'class-transformer';
import { IsNumber, ValidateNested } from 'class-validator';

export class SpatialVectorDto {
  @IsNumber()
  x!: number;

  @IsNumber()
  y!: number;

  @IsNumber()
  z!: number;
}

export class UpdateAssetTransformDto {
  @ValidateNested()
  @Type(() => SpatialVectorDto)
  position!: SpatialVectorDto;

  @ValidateNested()
  @Type(() => SpatialVectorDto)
  rotation!: SpatialVectorDto;

  @ValidateNested()
  @Type(() => SpatialVectorDto)
  scale!: SpatialVectorDto;
}