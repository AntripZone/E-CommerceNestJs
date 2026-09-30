import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';
import { CreateClienteDto } from '../../clientes/dto/create-cliente.dto.js';

export class RegistroClienteDto extends CreateClienteDto {
  @ApiProperty({ example: 'Julio12345' })
  @IsString({ message: 'password debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'password es obligatorio' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @Matches(/\S/, { message: 'La contraseña no puede contener solo espacios' })
  password!: string;
}
