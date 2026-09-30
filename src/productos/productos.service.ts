import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateProductoDto } from './dto/create-producto.dto.js';
import { UpdateProductoDto } from './dto/update-producto.dto.js';
import { FiltrosProductoDto } from './dto/filtro-producto.dto.js';
import { CreateImagenDto } from './dto/create-imagen.dto.js';

@Injectable()
export class ProductosService {
  constructor(private readonly prisma: PrismaService) {}

  private construirFiltro({
    filtroGeneral,
    categoriaId,
  }: FiltrosProductoDto): Prisma.ProductoWhereInput {
    return {
      ...(categoriaId && { categoriaId }),
      ...(filtroGeneral && {
        OR: [
          {
            nombre: { contains: filtroGeneral, mode: 'insensitive' },
          },
          { sku: { equals: filtroGeneral, mode: 'insensitive' } },
          { codigoBarras: filtroGeneral },
        ],
      }),
    };
  }

  private async validarCategoria(categoriaId: number) {
    const categoria = await this.prisma.categoria.findUnique({
      where: { id: categoriaId },
    });
    if (!categoria)
      throw new NotFoundException(
        `Categoria con ID: ${categoriaId} no encontrada.`,
      );
  }

  async create(createProductoDto: CreateProductoDto) {
    await this.validarCategoria(createProductoDto.categoriaId);

    return this.prisma.producto.create({ data: createProductoDto });
  }

  async findAll(filtros: FiltrosProductoDto) {
    return this.prisma.producto.findMany({
      where: this.construirFiltro(filtros),
      include: { categoria: { select: { id: true, nombre: true } } },
      orderBy: { nombre: 'asc' },
    });
  }

  async catalogo(filtros: FiltrosProductoDto) {
    return this.prisma.producto.findMany({
      where: {
        ...this.construirFiltro(filtros),
        activo: true,
        publicadoWeb: true,
      },
      omit: { precioCompra: true, stockMinimo: true, version: true },
      include: {
        categoria: { select: { id: true, nombre: true, slug: true } },
        imagenes: { orderBy: { orden: 'asc' } },
      },
      orderBy: { nombre: 'asc' },
    });
  }

  async stockBajo() {
    return this.prisma.producto.findMany({
      where: {
        activo: true,
        stock: {
          lte: this.prisma.producto.fields.stockMinimo,
        },
      },
      orderBy: { stock: 'asc' },
    });
  }

  async findOne(id: number) {
    const producto = await this.prisma.producto.findUnique({
      where: { id },
      include: {
        categoria: { select: { id: true, nombre: true } },
        imagenes: { orderBy: { orden: 'asc' } },
      },
    });
    if (!producto)
      throw new NotFoundException(`Producto con ID: ${id} no encontrado.`);

    return producto;
  }

  async update(id: number, updateProductoDto: UpdateProductoDto) {
    await this.findOne(id);
    if (updateProductoDto.categoriaId !== undefined)
      await this.validarCategoria(updateProductoDto.categoriaId);

    return this.prisma.producto.update({
      where: { id },
      data: updateProductoDto,
    });
  }

  //SoftDelete
  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.producto.update({
      where: { id },
      data: { activo: false, publicadoWeb: false },
    });
  }

  async agregarImagen(productoId: number, createImagenDto: CreateImagenDto) {
    await this.prisma.$transaction(async (transaction) => {
      if (createImagenDto.esPrincipal)
        await transaction.productoImagen.updateMany({
          where: { productoId },
          data: { esPrincipal: false },
        });
      return transaction.productoImagen.create({
        data: { ...createImagenDto, productoId },
      });
    });
  }

  async eliminarImagen(productoId: number, imagenId: number) {
    const imagen = await this.prisma.productoImagen.findFirst({
      where: { id: imagenId, productoId },
    });
    if (!imagen)
      throw new NotFoundException(
        `Imagen con ID: ${imagenId} no encontrada en el producto ${productoId}.`,
      );

    return this.prisma.productoImagen.delete({
      where: { id: imagenId },
    });
  }
}
