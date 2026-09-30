import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsString,
  MaxLength,
  NotEquals,
} from 'class-validator';

const trim = () =>
  Transform(({ value }) => (typeof value === 'string' ? value.trim() : value));

export class AjusteInventarioDto {
  @ApiProperty({ example: 1 })
  @IsInt({ message: 'productoId debe ser un número entero' })
  productoId!: number;

  @ApiProperty({
    example: -2,
    description: 'Positivo suma stock, negativo lo resta',
  })
  @IsInt({ message: 'La cantidad debe ser un número entero' })
  @NotEquals(0, { message: 'La cantidad del ajuste no puede ser 0' })
  cantidad!: number;

  @ApiProperty({ example: 'Merma: 2 piezas dañadas' })
  @trim()
  @IsString({ message: 'El motivo debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El motivo es obligatorio en un ajuste' })
  @MaxLength(255)
  motivo!: string;
}
