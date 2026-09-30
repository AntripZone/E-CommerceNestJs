import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser>(error: unknown, usuario: TUser, info: unknown): TUser {
    if (error) throw error;
    if (!usuario) {
      const motivo = info instanceof Error ? info.name : undefined;
      throw new UnauthorizedException(
        motivo === 'TokenExpiredError'
          ? 'Token expirado'
          : 'Token no proporcionado o inválido',
      );
    }
    return usuario;
  }
}
