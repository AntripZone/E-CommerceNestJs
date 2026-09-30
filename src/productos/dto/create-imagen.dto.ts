import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsUrl,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateImagenDto {
  @ApiProperty({ example: 'https://mi-cdn.com/productos/camisa-negra.jpg' })
  @IsUrl({}, { message: 'La url de la imagen no es válida' })
  @MaxLength(500)
  url!: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  orden?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  esPrincipal?: boolean;
}
