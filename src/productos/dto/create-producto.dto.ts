import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

const trim = () =>
  Transform(({ value }) => (typeof value === 'string' ? value.trim() : value));

export class CreateProductoDto {
  @ApiProperty({ example: 1 })
  @IsInt({ message: 'categoriaId debe ser un número entero' })
  categoriaId!: number;

  @ApiProperty({ example: 'CAM-NEG-M' })
  @trim()
  @IsString({ message: 'El SKU debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El SKU es obligatorio' })
  @MaxLength(50)
  sku!: string;

  @ApiPropertyOptional({ example: '7501234567890' })
  @IsOptional()
  @trim()
  @IsString()
  @MaxLength(50)
  codigoBarras?: string;

  @ApiProperty({ example: 'Camisa negra talla M' })
  @trim()
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @MaxLength(150)
  nombre!: string;

  @ApiPropertyOptional({ example: 'Camisa de algodón 100%' })
  @IsOptional()
  @trim()
  @IsString()
  descripcion?: string;

  @ApiProperty({ example: 120.5 })
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'precioCompra debe ser un número con máximo 2 decimales' },
  )
  @Min(0, { message: 'precioCompra no puede ser negativo' })
  precioCompra!: number;

  @ApiProperty({ example: 199.99 })
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'precioVenta debe ser un número con máximo 2 decimales' },
  )
  @Min(0, { message: 'precioVenta no puede ser negativo' })
  precioVenta!: number;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsInt()
  @Min(0)
  stockMinimo?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  publicadoWeb?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
