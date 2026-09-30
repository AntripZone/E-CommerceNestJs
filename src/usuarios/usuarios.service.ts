import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { CreateUsuarioDto } from './dto/create-usuario.dto.js';
import { UpdateUsuarioDto } from './dto/update-usuario.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class UsuariosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async contar() {
    return this.prisma.usuario.count();
  }

  private hashear(password: string) {
    return bcrypt.hash(
      password,
      Number(this.config.get('BCRYPT_SALT_ROUNDS') ?? 10),
    );
  }

  async create(createUsuarioDto: CreateUsuarioDto) {
    const { password, ...rest } = createUsuarioDto;
    return await this.prisma.usuario.create({
      data: {
        ...rest,
        passwordHash: await this.hashear(password),
      },
      omit: { passwordHash: true },
    });
  }

  async findAll() {
    return this.prisma.usuario.findMany({
      omit: { passwordHash: true },
      orderBy: { id: 'asc' },
    });
  }

  async findOne(id: number) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id },
      omit: { passwordHash: true },
    });
    if (!usuario)
      throw new NotFoundException(`Usuario con ID: ${id} no encontrado.`);

    return usuario;
  }

  async update(id: number, updateUsuarioDto: UpdateUsuarioDto) {
    await this.findOne(id);
    const { password, ...rest } = updateUsuarioDto;

    return await this.prisma.usuario.update({
      where: { id },
      data: {
        ...rest,
        ...(password && { passwordHash: await this.hashear(password) }),
      },
      omit: { passwordHash: true },
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.usuario.update({
      where: { id },
      data: { activo: false },
      omit: { passwordHash: true },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.usuario.findUnique({
      where: { email },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        activo: true,
        passwordHash: true,
      },
    });
  }

  async findActivoById(id: number) {
    return this.prisma.usuario.findFirst({
      where: { id, activo: true },
      select: { id: true, email: true, rol: true },
    });
  }
}
