import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class SignupDto {
    @IsEmail()
    email!: string;

    @IsString()
    @MinLength(8, { message: 'Password must be at least 8 characters' })
    @MaxLength(72) // giới hạn của bcrypt, input dài hơn bị cắt ngầm
    password!: string;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    name?: string;
}