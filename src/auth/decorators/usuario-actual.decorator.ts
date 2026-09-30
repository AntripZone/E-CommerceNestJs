import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RolToken } from './roles.decorator.js';

export interface UsuarioToken {
  id: number;
  email: string;
  rol: RolToken;
}

export const UsuarioActual = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UsuarioToken =>
    ctx.switchToHttp().getRequest().user,
);
