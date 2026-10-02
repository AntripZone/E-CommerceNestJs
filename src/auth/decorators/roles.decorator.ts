import { SetMetadata } from '@nestjs/common';
import { Rol } from '../../generated/prisma/enums.js';

export type RolToken = Rol | 'CLIENTE'; //Me dio weba agregar cliente en el Rol

export const Roles = (...roles: RolToken[]) => SetMetadata('roles', roles);
