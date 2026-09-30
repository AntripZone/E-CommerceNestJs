import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

const trim = () =>
  Transform(({ value }) => (typeof value === 'string' ? value.trim() : value));

export class DatosEnvioDto {
  @ApiProperty({ example: 'María López' })
  @trim()
  @IsString({ message: 'El destinatario debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El destinatario es obligatorio' })
  @MaxLength(150)
  destinatario!: string;

  @ApiProperty({ example: '986437664' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.replace(/[\s()-]/g, '') : value,
  )
  @IsString()
  @Matches(/^\+?\d{7,15}$/, {
    message: 'El teléfono de contacto debe tener entre 7 y 15 dígitos',
  })
  telefonoContacto!: string;

  @ApiProperty({ example: 'Av. España 1234, Trujillo' })
  @trim()
  @IsString({ message: 'La dirección debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'La dirección de entrega es obligatoria' })
  @MaxLength(255)
  direccionEntrega!: string;

  @ApiPropertyOptional({ example: 'Casa verde de 2 pisos, frente al parque' })
  @IsOptional()
  @trim()
  @IsString()
  @MaxLength(255)
  referencias?: string;
}
