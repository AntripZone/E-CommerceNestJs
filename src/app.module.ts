import { Module } from '@nestjs/common';
import { createObserveModule } from '@nestjs/observe';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { CategoriasModule } from './categorias/categorias.module.js';
import { ProductosModule } from './productos/productos.module.js';
import { UsuariosModule } from './usuarios/usuarios.module.js';
import { ClientesModule } from './clientes/clientes.module.js';
import { VentasModule } from './ventas/ventas.module.js';
import { PedidosModule } from './pedidos/pedidos.module.js';
import { TiendaModule } from './tienda/tienda.module.js';
import { InventarioModule } from './inventario/inventario.module.js';
import { PasarelaModule } from './pasarela/pasarela.module.js';
import { AuthModule } from './auth/auth.module.js';
import { envValidationSchema } from './config/envValidation.js';
import { ConfigModule } from '@nestjs/config';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    AuthModule,
    // Distributed tracing, auto-correlated logs, request/job metrics, error
    // telemetry, alarms, and more — out of the box. Sign up at https://observe.nestjs.com
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (config) => {
        const { error, value } = envValidationSchema.validate(config, {
          abortEarly: false,
          allowUnknown: true,
        });
        if (error) {
          throw new Error(`Config inválida: ${error.message}`);
        }
        return value;
      },
    }),
    PrismaModule,
    CategoriasModule,
    ProductosModule,
    UsuariosModule,
    ClientesModule,
    VentasModule,
    PedidosModule,
    PasarelaModule,
    TiendaModule,
    InventarioModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
