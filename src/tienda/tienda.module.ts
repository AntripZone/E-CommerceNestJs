import { Module } from '@nestjs/common';
import { TiendaService } from './tienda.service.js';
import { TiendaController } from './tienda.controller.js';
import { PedidosModule } from '../pedidos/pedidos.module.js';

@Module({
  imports: [PedidosModule],
  controllers: [TiendaController],
  providers: [TiendaService],
})
export class TiendaModule {}
