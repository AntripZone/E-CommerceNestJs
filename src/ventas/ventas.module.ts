import { Module } from '@nestjs/common';
import { VentasService } from './ventas.service.js';
import { VentasController } from './ventas.controller.js';
import { InventarioModule } from '../inventario/inventario.module.js';

@Module({
  imports: [InventarioModule],
  controllers: [VentasController],
  providers: [VentasService],
})
export class VentasModule {}
