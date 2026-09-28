import { PartialType } from '@nestjs/swagger';
import { CreateCategoriaDto } from './create-categoria.dto.js';

export class UpdateCategoriaDto extends PartialType(CreateCategoriaDto) {}
