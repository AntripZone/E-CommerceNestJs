import { PartialType } from '@nestjs/swagger';
import { CreateVentaDto } from './create-venta.dto.js';

export class UpdateVentaDto extends PartialType(CreateVentaDto) {}
