import { PartialType } from '@nestjs/swagger';
import { CreatePagoDto } from './create-pago.dto.js';

export class UpdatePagoDto extends PartialType(CreatePagoDto) {}
