import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service.js';
import { CreateUsuarioDto } from '../usuarios/dto/create-usuario.dto.js';
import { RegistroClienteDto } from './dto/registro-cliente.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { UsuarioActual } from './decorators/usuario-actual.decorator.js';
import type { UsuarioToken } from './decorators/usuario-actual.decorator.js';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() createUsuarioDto: CreateUsuarioDto) {
    return this.authService.register(createUsuarioDto);
  }
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('clientes/registro')
  registrarCliente(@Body() registroClienteDto: RegistroClienteDto) {
    return this.authService.registrarCliente(registroClienteDto);
  }

  @Post('clientes/login')
  loginCliente(@Body() loginDto: LoginDto) {
    return this.authService.loginCliente(loginDto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async profile(@UsuarioActual() usuario: UsuarioToken) {
    return usuario;
  }
}
