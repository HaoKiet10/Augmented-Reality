import { IsNumber, Min } from 'class-validator';

/**
 * Kích thước thật của trigger image ngoài đời, tính bằng mét.
 * Designer nhập tay khi upload trigger image (đo thực tế poster/logo sẽ in ra).
 * Mobile app dùng giá trị này làm physicalWidth cho ViroARImageMarker.
 */
export class SetTriggerDimensionsDto {
  @IsNumber()
  @Min(0.01)
  physicalWidth!: number;

  @IsNumber()
  @Min(0.01)
  physicalHeight!: number;
}
