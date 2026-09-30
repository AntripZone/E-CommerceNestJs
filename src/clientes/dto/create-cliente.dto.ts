import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

const trim = () =>
  Transform(({ value }) => (typeof value === 'string' ? value.trim() : value));

const soloDigitos = () =>
  Transform(({ value }) =>
    typeof value === 'string' ? value.replace(/[\s()-]/g, '') : value,
  );

export class CreateClienteDto {
  @ApiProperty({ example: 'Adrian Alva' })
  @trim()
  @IsString({ message: 'El nombre debe ser una cadena de texto ' })
  @IsNotEmpty({ message: 'El nombre es obligatorio ' })
  @MaxLength(150)
  nombre!: string;

  @ApiProperty({ example: '986437664' })
  @soloDigitos()
  @IsString({ message: 'El teléfono debe ser una cadena de texto' })
  @Matches(/^\+?\d{7,15}$/, {
    message: 'El teléfono debe tener entre 7 y 15 dígitos',
  })
  telefono!: string;

  @ApiPropertyOptional({ example: 'adrian@example.com' })
  @trim()
  @IsEmail({}, { message: 'El email debe estar en el formato correcto' })
  @MaxLength(150)
  email!: string;

  @ApiPropertyOptional({ example: 'Av. Juárez 123, Trujillo, Peru' })
  @IsOptional()
  @trim()
  @IsString()
  @MaxLength(255)
  direccion?: string;
}
