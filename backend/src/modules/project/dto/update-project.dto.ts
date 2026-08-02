import { IsDateString, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Chỉ liệt kê ĐÚNG các field người dùng được phép tự sửa qua API.
 * Không bao giờ thêm designerId, triggerImage, publishedAt, id... vào đây —
 * những field đó chỉ được backend tự set qua các luồng nghiệp vụ riêng
 * (setTriggerImage, publish flow...), không phải qua PATCH tự do của client.
 */
export class UpdateProjectDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsIn(['draft', 'published', 'archived'])
  status?: string;

  // Dashboard đánh dấu "vừa mở project" bằng field này để sắp xếp danh sách gần đây.
  // Chỉ ảnh hưởng thứ tự hiển thị project của CHÍNH người dùng đó, không có tác động
  // bảo mật nếu client tự set giá trị tuỳ ý.
  @IsOptional()
  @IsDateString()
  lastOpenedAt?: string;
}