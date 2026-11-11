import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RecordScanDto {
  /** ID ẩn danh do mobile app sinh mỗi phiên — dùng để bỏ qua quét lặp. */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  deviceId?: string;
}
