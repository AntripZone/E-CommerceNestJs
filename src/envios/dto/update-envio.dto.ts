import { PartialType } from '@nestjs/swagger';
import { CreateEnvioDto } from './create-envio.dto.js';

export class UpdateEnvioDto extends PartialType(CreateEnvioDto) {}
