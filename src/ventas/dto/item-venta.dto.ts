import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class AgregarItemDto {
  @ApiProperty({ example: 1 })
  @IsInt({ message: 'productoId debe ser un número entero' })
  productoId!: number;

  @ApiProperty({ example: 2 })
  @IsInt({ message: 'La cantidad debe ser un número entero' })
  @Min(1, { message: 'La cantidad mínima es 1' })
  cantidad!: number;
}

export class ActualizarItemDto {
  @ApiProperty({ example: 3, description: 'Nueva cantidad total del producto' })
  @IsInt({ message: 'La cantidad debe ser un número entero' })
  @Min(1, { message: 'La cantidad mínima es 1; para quitarlo usa DELETE' })
  cantidad!: number;
}
