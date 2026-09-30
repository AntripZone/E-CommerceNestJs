import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsuariosService } from '../../usuarios/usuarios.service.js';
import { ClientesService } from '../../clientes/clientes.service.js';
import type { RolToken } from '../decorators/roles.decorator.js';
import type { UsuarioToken } from '../decorators/usuario-actual.decorator.js';

export interface JwtPayload {
  sub: number;
  email: string;
  rol: RolToken;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly usuariosService: UsuariosService,
    private readonly clientesService: ClientesService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<UsuarioToken> {
    //Para el token de mi cliente web
    if (payload.rol === 'CLIENTE') {
      const cliente = await this.clientesService.findCuentaById(payload.sub);
      if (!cliente)
        throw new UnauthorizedException('Cliente inexistente o sin cuenta');

      return { id: cliente.id, email: cliente.email, rol: 'CLIENTE' };
    }

    //Este es del personal
    const usuario = await this.usuariosService.findActivoById(payload.sub);
    if (!usuario)
      throw new UnauthorizedException('Usuario inactivo o inexistente');

    return { id: usuario.id, email: usuario.email, rol: usuario.rol };
  }
}
