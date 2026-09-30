import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class FiltrosProductoDto {
  @ApiPropertyOptional({
    description: 'Busca por nombre, SKU o código de barras',
  })
  @IsOptional()
  @IsString()
  filtroGeneral?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'categoriaId debe ser un número entero' })
  categoriaId?: number;
}
