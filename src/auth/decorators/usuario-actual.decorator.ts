import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Rol } from '../../generated/prisma/enums.js';

export interface UsuarioToken {
  id: number;
  email: string;
  rol: Rol;
}

export const UsuarioActual = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UsuarioToken =>
    ctx.switchToHttp().getRequest().user,
);
