import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Auth } from '../auth/decorators/auth.decorator.js';
import type { JwtPayload } from '../auth/auth.service.js';
import { CreateSpecialtyDto } from './dto/create-specialty.dto.js';
import { DeactivateSpecialtyDto } from './dto/deactivate-specialty.dto.js';
import { ReplaceSpecialtyDto } from './dto/replace-specialty.dto.js';
import { UpdateSpecialtyDto } from './dto/update-specialty.dto.js';
import { SpecialtiesService } from './specialties.service.js';

type AuthenticatedRequest = Request & { user: JwtPayload };

@ApiTags('Спеціальності')
@Auth('admin')
@Controller('specialties')
export class SpecialtiesController {
  constructor(private readonly specialtiesService: SpecialtiesService) {}

  @Get()
  @ApiOperation({
    summary: 'Отримати список спеціальностей',
    description:
      'Повертає довідник спеціальностей із лічильниками освітніх програм та звʼязками правонаступництва. Доступно всім адміністраторам.',
  })
  @ApiQuery({
    name: 'includeInactive',
    required: false,
    type: Boolean,
    description: 'Включити неактивні та замінені спеціальності',
  })
  findAll(
    @Req() req: AuthenticatedRequest,
    @Query('includeInactive') includeInactive?: string,
  ) {
    return this.specialtiesService.findAll(
      req.user.sub,
      includeInactive === 'true',
    );
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Отримати детальну інформацію про спеціальність',
  })
  findOne(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.specialtiesService.findOne(req.user.sub, id);
  }

  @Post()
  @ApiOperation({
    summary: 'Створити нову спеціальність (лише головний адміністратор)',
  })
  create(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateSpecialtyDto,
  ) {
    return this.specialtiesService.create(req.user.sub, dto);
  }

  @Patch(':id')
  @ApiOperation({
    summary:
      'Редагувати код або назву спеціальності на місці (лише головний адміністратор)',
    description:
      'Призначено для виправлення одруківок і редакційних уточнень. Для перекодування (напр. 126 → F6) використовуйте ендпоїнт заміни.',
  })
  update(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSpecialtyDto,
  ) {
    return this.specialtiesService.update(req.user.sub, id, dto);
  }

  @Post(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Деактивувати спеціальність без правонаступника (лише головний адміністратор)',
  })
  deactivate(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DeactivateSpecialtyDto,
  ) {
    return this.specialtiesService.deactivate(req.user.sub, id, dto);
  }

  @Post(':id/activate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Повторно активувати деактивовану спеціальність (лише головний адміністратор)',
  })
  activate(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.specialtiesService.activate(req.user.sub, id);
  }

  @Post(':id/replace')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Замінити (перекодувати) спеціальність правонаступником (лише головний адміністратор)',
    description:
      'Деактивує поточну спеціальність і повʼязує її з новою або існуючою активною спеціальністю без перезапису історичних даних. За потреби клонує активні ОП під правонаступника.',
  })
  replace(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReplaceSpecialtyDto,
  ) {
    return this.specialtiesService.replace(req.user.sub, id, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Видалити порожню спеціальність (лише головний адміністратор)',
  })
  async remove(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.specialtiesService.remove(req.user.sub, id);
    return { message: 'Спеціальність успішно видалено' };
  }
}
