import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PedidosService } from './pedidos.service.js';
import { CrearPedidoDto } from './dto/crear-pedido.dto.js';
import { CambiarEstadoPedidoDto } from './dto/cambiar-estado.dto.js';
import { FiltrosPedidoDto } from './dto/filtros-pedido.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { UsuarioActual } from '../auth/decorators/usuario-actual.decorator.js';
import type { UsuarioToken } from '../auth/decorators/usuario-actual.decorator.js';

@ApiTags('pedidos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'CAJERO')
@Controller('pedidos')
export class PedidosController {
  constructor(private readonly pedidosService: PedidosService) {}

  @Post()
  crear(
    @Body() crearPedidoDto: CrearPedidoDto,
    @UsuarioActual() usuario: UsuarioToken,
  ) {
    return this.pedidosService.crear(crearPedidoDto, usuario.id);
  }

  @Get()
  findCola(@Query() filtros: FiltrosPedidoDto) {
    return this.pedidosService.findCola(filtros);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.pedidosService.findOne(id);
  }

  @Patch(':id/estado')
  cambiarEstado(
    @Param('id', ParseIntPipe) id: number,
    @Body() cambiarEstadoDto: CambiarEstadoPedidoDto,
    @UsuarioActual() usuario: UsuarioToken,
  ) {
    return this.pedidosService.cambiarEstado(id, cambiarEstadoDto, usuario.id);
  }
}
