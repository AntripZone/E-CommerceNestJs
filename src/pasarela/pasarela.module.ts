import { Module } from '@nestjs/common';
import { PasarelaService } from './pasarela.service.js';
import { PasarelaController } from './pasarela.controller.js';

@Module({
  controllers: [PasarelaController],
  providers: [PasarelaService],
})
export class PasarelaModule {}
