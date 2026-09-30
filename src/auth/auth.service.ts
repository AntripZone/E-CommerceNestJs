import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsuariosService } from '../usuarios/usuarios.service.js';
import { ClientesService } from '../clientes/clientes.service.js';
import { CreateUsuarioDto } from '../usuarios/dto/create-usuario.dto.js';
import { Rol } from '../generated/prisma/enums.js';
import { LoginDto } from './dto/login.dto.js';
import { RegistroClienteDto } from './dto/registro-cliente.dto.js';
import type { JwtPayload } from './strategies/jwt.strategy.js';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private readonly usuariosService: UsuariosService,
    private readonly clientesService: ClientesService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(createUsuarioDto: CreateUsuarioDto) {
    if ((await this.usuariosService.contar()) > 0)
      throw new ForbiddenException(
        'Un ADMIN debe crear los usuarios en /usuarios',
      );

    return this.usuariosService.create({ ...createUsuarioDto, rol: Rol.ADMIN });
  }

  async login(loginDto: LoginDto) {
    const usuario = await this.usuariosService.findByEmail(loginDto.email);

    const passwordValida =
      usuario?.activo &&
      (await bcrypt.compare(loginDto.passwordHash, usuario.passwordHash));
    if (!usuario || !passwordValida)
      throw new UnauthorizedException('Credenciales inválidas');

    const payload: JwtPayload = {
      sub: usuario.id,
      email: usuario.email,
      rol: usuario.rol,
    };

    return {
      access_token: await this.jwtService.signAsync(payload),
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
      },
    };
  }

  async registrarCliente(registroClienteDto: RegistroClienteDto) {
    const { password, ...datos } = registroClienteDto;
    const passwordHash = await bcrypt.hash(
      password,
      Number(this.config.get('BCRYPT_SALT_ROUNDS') ?? 10),
    );

    return this.clientesService.crearCuenta(datos, passwordHash);
  }

  async loginCliente(loginDto: LoginDto) {
    const cliente = await this.clientesService.findCuentaByEmail(
      loginDto.email,
    );

    const passwordValida =
      cliente?.passwordHash &&
      (await bcrypt.compare(loginDto.passwordHash, cliente.passwordHash));
    if (!cliente || !passwordValida)
      throw new UnauthorizedException('Credenciales inválidas');

    const payload: JwtPayload = {
      sub: cliente.id,
      email: cliente.email,
      rol: 'CLIENTE',
    };

    return {
      access_token: await this.jwtService.signAsync(payload),
      cliente: { id: cliente.id, nombre: cliente.nombre, email: cliente.email },
    };
  }
}
