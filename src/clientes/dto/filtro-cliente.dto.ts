import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class FiltrosClienteDto {
  @ApiPropertyOptional({
    description: 'Busca por nombre, teléfono o email',
  })
  @IsOptional()
  @IsString()
  filtroGeneral?: string;
}
