import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { InventarioService } from './inventario.service.js';
import { EntradaInventarioDto } from './dto/entrada-inventario.dto.js';
import { AjusteInventarioDto } from './dto/ajuste-inventario.dto.js';
import { FiltrosMovimientoDto } from './dto/filtros-movimiento.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { UsuarioActual } from '../auth/decorators/usuario-actual.decorator.js';
import type { UsuarioToken } from '../auth/decorators/usuario-actual.decorator.js';
import { Rol } from '../generated/prisma/enums.js';

@ApiTags('inventario')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('inventario')
export class InventarioController {
  constructor(private readonly inventarioService: InventarioService) {}

  @Post('entradas')
  registrarEntrada(
    @Body() entradaInventarioDto: EntradaInventarioDto,
    @UsuarioActual() usuario: UsuarioToken,
  ) {
    return this.inventarioService.registrarEntrada(
      entradaInventarioDto,
      usuario.id,
    );
  }

  @Post('ajustes')
  registrarAjuste(
    @Body() ajusteInventarioDto: AjusteInventarioDto,
    @UsuarioActual() usuario: UsuarioToken,
  ) {
    return this.inventarioService.registrarAjuste(
      ajusteInventarioDto,
      usuario.id,
    );
  }

  @Roles('ADMIN', 'CAJERO')
  @Get('movimientos')
  findAll(@Query() filtros: FiltrosMovimientoDto) {
    return this.inventarioService.findAll(filtros);
  }

  @Roles('ADMIN', 'CAJERO')
  @Get('moviemtos/:id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.inventarioService.findOne(id);
  }

  @Get('historialProducto/:productoId')
  historialProducto(@Param('productoId', ParseIntPipe) productoId: number) {
    return this.inventarioService.historialProducto(productoId);
  }
}
