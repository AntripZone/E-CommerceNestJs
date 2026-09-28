import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { UsuariosService } from '../usuarios/usuarios.service.js';
import { CreateUsuarioDto } from '../usuarios/dto/create-usuario.dto.js';
import { LoginDto } from './dto/login.dto.js';
@Injectable()
export class AuthService {
  constructor(private readonly usuariosService: UsuariosService) {}

  async register(createUsuarioDto: CreateUsuarioDto) {
    return this.usuariosService.create(createUsuarioDto);
  }

  async login(LoginDto: LoginDto) {
    const usuario = await this.usuariosService.findByEmail(LoginDto.email);
    if (!usuario) {
      throw new UnauthorizedException('Credenciales Invalidas');
    }
    const isMatch = await bcrypt.compare(
      LoginDto.passwordHash,
      usuario.passwordHash,
    );
    if (!isMatch) {
      throw new UnauthorizedException('Credenciales Invalidas');
    }
    const token = jwt.sign(
      { id: usuario.id, email: usuario.email, rol: usuario.rol },
      process.env.JWT_SECRET as string,
      { expiresIn: '8h' },
    );
    return { token };
  }
}
