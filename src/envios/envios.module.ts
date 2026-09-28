import { Module } from '@nestjs/common';
import { EnviosService } from './envios.service.js';
import { EnviosController } from './envios.controller.js';

@Module({
  controllers: [EnviosController],
  providers: [EnviosService],
})
export class EnviosModule {}
