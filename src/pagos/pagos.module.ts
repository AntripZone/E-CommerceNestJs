import { Module } from '@nestjs/common';
import { PagosService } from './pagos.service.js';
import { PagosController } from './pagos.controller.js';

@Module({
  controllers: [PagosController],
  providers: [PagosService],
})
export class PagosModule {}
