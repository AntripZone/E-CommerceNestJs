import {
  Body,
  Controller,
  Delete,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { VentasService } from './ventas.service.js';
import { AbrirVentaDto } from './dto/abrir-venta.dto.js';
import { ActualizarItemDto, AgregarItemDto } from './dto/item-venta.dto.js';
import { CobrarVentaDto } from './dto/cobrar-venta.dto.js';
import { FiltrosVentaDto } from './dto/filtro-venta.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { UsuarioActual } from '../auth/decorators/usuario-actual.decorator.js';
import type { UsuarioToken } from '../auth/decorators/usuario-actual.decorator.js';

@ApiTags('ventas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'CAJERO')
@Controller('ventas')
export class VentasController {
  constructor(private readonly ventasService: VentasService) {}

  @Post()
  abrir(
    @Body() abrirVentaDto: AbrirVentaDto,
    @UsuarioActual() usuario: UsuarioToken,
  ) {
    return this.ventasService.abrir(abrirVentaDto, usuario.id);
  }

  @Post(':id/items')
  agregarItem(
    @Param('id', ParseIntPipe) id: number,
    @Body() agregarItemDto: AgregarItemDto,
  ) {
    return this.ventasService.agregarItem(id, agregarItemDto);
  }

  @Patch(':id/items/:productoId')
  actualizarItem(
    @Param('id', ParseIntPipe) id: number,
    @Param('productoId', ParseIntPipe) productoId: number,
    @Body() actualizarItemDto: ActualizarItemDto,
  ) {
    return this.ventasService.actualizarItem(id, productoId, actualizarItemDto);
  }

  @Delete(':id/items/:productoId')
  quitarItem(
    @Param('id', ParseIntPipe) id: number,
    @Param('productoId', ParseIntPipe) productoId: number,
  ) {
    return this.ventasService.quitarItem(id, productoId);
  }

  @Post(':id/cobrar')
  cobrar(
    @Param('id', ParseIntPipe) id: number,
    @Body() cobrarVentaDto: CobrarVentaDto,
    @UsuarioActual() usuario: UsuarioToken,
  ) {
    return this.ventasService.cobrar(id, cobrarVentaDto, usuario.id);
  }

  @Get()
  findAll(@Query() filtros: FiltrosVentaDto) {
    return this.ventasService.findAll(filtros);
  }

  @Get(':id/comprobante')
  comprobante(@Param('id', ParseIntPipe) id: number) {
    return this.ventasService.comprobante(id);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.ventasService.findOne(id);
  }

  @Roles('ADMIN')
  @Patch(':id/cancelar')
  cancelar(
    @Param('id', ParseIntPipe) id: number,
    @UsuarioActual() usuario: UsuarioToken,
  ) {
    return this.ventasService.cancelar(id, usuario.id);
  }
}
