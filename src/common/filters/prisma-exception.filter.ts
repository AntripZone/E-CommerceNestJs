import { Request, response, Response } from 'express';
import { Prisma } from '../../generated/prisma/client.js';
import {
  ArgumentsHost,
  Catch,
  ConflictException,
  ExceptionFilter,
  NotFoundException,
} from '@nestjs/common';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  // res.status().json()
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    switch (exception.code) {
      case 'P2001':
        return response
          .status(404)
          .json(new NotFoundException('Registro no encontrado').getResponse());
      case 'P2002':
        return response
          .status(409)
          .json(
            new ConflictException(
              'Ya existe un registro con ese valor único',
            ).getResponse(),
          );
        break;
      case 'P2025':
        return response
          .status(404)
          .json(new NotFoundException('Registro no encontrado').getResponse());
        break;
      default:
        throw exception;
    }
  }
}
