import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateUsuarioDto } from './dto/create-usuario.dto.js';
import { UpdateUsuarioDto } from './dto/update-usuario.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsuariosService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createUsuarioDto: CreateUsuarioDto) {
    const { password, ...rest } = createUsuarioDto;
    return await this.prisma.usuario.create({
      data: {
        ...rest,
        passwordHash: await bcrypt.hash(password, 10),
      },
    });
  }

  async findAll() {
    return this.prisma.usuario.findMany({
      orderBy: { id: 'asc' },
    });
  }

  async findOne(id: number) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id },
    });
    if (!usuario)
      throw new NotFoundException(`Usuario con ID: ${id} no encontrado.`);

    return usuario;
  }

  async update(id: number, updateUsuarioDto: UpdateUsuarioDto) {
    return await this.prisma.usuario.update({
      where: { id },
      data: updateUsuarioDto,
    });
  }

  async remove(id: number) {
    const user = await this.prisma.usuario.findUnique({
      where: { id },
    });
    if (!user)
      throw new NotFoundException(`usuario de ID: ${id} no encontrado`);

    return await this.prisma.usuario.delete({
      where: { id },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.usuario.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        rol: true,
        creadoEn: true,
        passwordHash: true,
      },
    });
  }
}
