import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateProjectDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  name!: string;
}