import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  Matches,
} from 'class-validator';
import { Rol } from '../../generated/prisma/enums.js';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

const trim = () =>
  Transform(({ value }) => (typeof value === 'string' ? value.trim() : value));

export class CreateUsuarioDto {
  @ApiProperty({ example: 'Ana' })
  @trim()
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @MaxLength(100)
  nombre!: string;

  @ApiProperty({ example: 'ana@example.com' })
  @trim()
  @IsEmail({}, { message: 'El email debe estar en el formato correcto' })
  @MaxLength(150)
  email!: string;

  @IsString({ message: 'password debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'password es obligatorio' })
  @MinLength(8, { message: 'la contraseña debe tener almenos 6 caracteres' })
  @Matches(/\S/, {
    message: 'La contraseña no puede contener solo espacios',
  })
  password!: string;

  @IsEnum(Rol, { message: 'El rol debe ser ADMIN o CAJERO' })
  rol?: Rol;
}
