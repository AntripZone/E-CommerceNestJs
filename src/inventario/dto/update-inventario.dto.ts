import { PartialType } from '@nestjs/swagger';
import { CreateInventarioDto } from './create-inventario.dto.js';

export class UpdateInventarioDto extends PartialType(CreateInventarioDto) {}
