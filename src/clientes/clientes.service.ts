import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateClienteDto } from './dto/create-cliente.dto.js';
import { UpdateClienteDto } from './dto/update-cliente.dto.js';
import { FiltrosClienteDto } from './dto/filtro-cliente.dto.js';

@Injectable()
export class ClientesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createClienteDto: CreateClienteDto) {
    return this.prisma.cliente.create({
      data: createClienteDto,
    });
  }

  async findAll({ filtroGeneral }: FiltrosClienteDto) {
    return this.prisma.cliente.findMany({
      where: filtroGeneral
        ? {
            OR: [
              { nombre: { contains: filtroGeneral, mode: 'insensitive' } },
              { telefono: { contains: filtroGeneral } },
              { email: { contains: filtroGeneral, mode: 'insensitive' } },
            ],
          }
        : undefined,
      include: { _count: { select: { ventas: true } } },
      orderBy: { nombre: 'asc' },
    });
  }

  async findByTelefono(telefono: string) {
    const cliente = await this.prisma.cliente.findUnique({
      where: { telefono: telefono.replace(/[\s()-]/g, '') },
    });
    if (!cliente)
      throw new NotFoundException(
        `Cliente con teléfono: ${telefono} no encontrado.`,
      );

    return cliente;
  }

  async findOne(id: number) {
    const cliente = await this.prisma.cliente.findUnique({
      where: { id },
      include: {
        ventas: {
          select: {
            id: true,
            folio: true,
            canal: true,
            estado: true,
            total: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        _count: { select: { ventas: true } },
      },
    });
    if (!cliente)
      throw new NotFoundException(`Cliente con ID: ${id} no encontrado.`);

    return cliente;
  }

  async update(id: number, updateClienteDto: UpdateClienteDto) {
    await this.findOne(id);
    return this.prisma.cliente.update({
      where: { id },
      data: updateClienteDto,
    });
  }

  async remove(id: number) {
    const cliente = await this.findOne(id);
    if (cliente._count.ventas > 0)
      throw new ConflictException(
        `El cliente tiene ${cliente._count.ventas} venta(s) registradas y no puede eliminarse.`,
      );

    return this.prisma.cliente.delete({ where: { id } });
  }

  async crearCuenta(createClienteDto: CreateClienteDto, passwordHash: string) {
    return this.prisma.cliente.create({
      data: { ...createClienteDto, passwordHash },
      omit: { passwordHash: true },
    });
  }

  async findCuentaByEmail(email: string) {
    return this.prisma.cliente.findUnique({
      where: { email },
      select: { id: true, nombre: true, email: true, passwordHash: true },
    });
  }

  async findCuentaById(id: number) {
    return this.prisma.cliente.findFirst({
      where: { id, passwordHash: { not: null } },
      select: { id: true, email: true },
    });
  }
}
