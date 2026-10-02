import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TiendaService } from './tienda.service.js';
import { DatosEnvioDto } from '../pedidos/dto/datos-envio.dto.js';
import {
  ActualizarItemDto,
  AgregarItemDto,
} from '../ventas/dto/item-venta.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { UsuarioActual } from '../auth/decorators/usuario-actual.decorator.js';
import type { UsuarioToken } from '../auth/decorators/usuario-actual.decorator.js';

// Carrito y pedidos del cliente web autenticado
@ApiTags('tienda')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('CLIENTE')
@Controller('tienda')
export class TiendaController {
  constructor(private readonly tiendaService: TiendaService) {}

  @Get('carrito')
  obtenerCarrito(@UsuarioActual() cliente: UsuarioToken) {
    return this.tiendaService.obtenerCarrito(cliente.id);
  }

  @Post('carrito/items')
  agregarItem(
    @UsuarioActual() cliente: UsuarioToken,
    @Body() agregarItemDto: AgregarItemDto,
  ) {
    return this.tiendaService.agregarItem(cliente.id, agregarItemDto);
  }

  @Patch('carrito/items/:productoId')
  actualizarItem(
    @UsuarioActual() cliente: UsuarioToken,
    @Param('productoId', ParseIntPipe) productoId: number,
    @Body() actualizarItemDto: ActualizarItemDto,
  ) {
    return this.tiendaService.actualizarItem(
      cliente.id,
      productoId,
      actualizarItemDto,
    );
  }

  @Delete('carrito/items/:productoId')
  quitarItem(
    @UsuarioActual() cliente: UsuarioToken,
    @Param('productoId', ParseIntPipe) productoId: number,
  ) {
    return this.tiendaService.quitarItem(cliente.id, productoId);
  }

  @Post('carrito/confirmar')
  confirmar(
    @UsuarioActual() cliente: UsuarioToken,
    @Body() datosEnvioDto: DatosEnvioDto,
  ) {
    return this.tiendaService.confirmar(cliente.id, datosEnvioDto);
  }

  @Get('pedidos')
  misPedidos(@UsuarioActual() cliente: UsuarioToken) {
    return this.tiendaService.misPedidos(cliente.id);
  }

  @Get('pedidos/:id')
  miPedido(
    @UsuarioActual() cliente: UsuarioToken,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.tiendaService.miPedido(cliente.id, id);
  }
}
