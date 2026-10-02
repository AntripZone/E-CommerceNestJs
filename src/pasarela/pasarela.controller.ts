import {
  Body,
  Controller,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';

import { ApiBearerAuth, ApiTags, ApiBody } from '@nestjs/swagger';
import { PasarelaService } from './pasarela.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { UsuarioActual } from '../auth/decorators/usuario-actual.decorator.js';
import type { UsuarioToken } from '../auth/decorators/usuario-actual.decorator.js';

@ApiTags('pasarela')
@Controller('pasarela')
export class PasarelaController {
  constructor(private readonly pasarelaService: PasarelaService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CLIENTE')
  @Post('pedidos/:id/checkout')
  iniciarPago(
    @Param('id', ParseIntPipe) id: number,
    @UsuarioActual() cliente: UsuarioToken,
  ) {
    return this.pasarelaService.iniciarPago(id, cliente.id);
  }

  @ApiBody({
    schema: {
      type: 'object',
      example: { id: '79a5959f-ddd3-4139-843e-0b2fbb097a07' },
    },
  })
  @Post('webhook')
  @HttpCode(200)
  webhook(@Body() body: Record<string, unknown>) {
    return this.pasarelaService.procesarWebhook(body);
  }
}
