import { SetMetadata } from '@nestjs/common';
import { Rol } from '../../generated/prisma/enums.js';
export const Roles = (...roles: Rol[]) => SetMetadata('roles', roles);
