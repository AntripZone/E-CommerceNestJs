import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

const trim = () =>
  Transform(({ value }) => (typeof value === 'string' ? value.trim() : value));

export class EntradaInventarioDto {
  @ApiProperty({ example: 1 })
  @IsInt({ message: 'productoId debe ser un número entero' })
  productoId!: number;

  @ApiProperty({ example: 20 })
  @IsInt({ message: 'La cantidad debe ser un número entero' })
  @Min(1, { message: 'La cantidad mínima de una entrada es 1' })
  cantidad!: number;

  @ApiPropertyOptional({
    example: 115.0,
    description: 'Nuevo costo de compra; si se envía, actualiza precioCompra',
  })
  @IsOptional()
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'costoUnitario debe ser un número con máximo 2 decimales' },
  )
  @Min(0, { message: 'costoUnitario no puede ser negativo' })
  costoUnitario?: number;

  @ApiPropertyOptional({ example: 'Compra a proveedor, factura A-123' })
  @IsOptional()
  @trim()
  @IsString()
  @MaxLength(255)
  motivo?: string;
}
