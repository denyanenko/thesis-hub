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
import { CreateEducationalProgramDto } from './dto/create-educational-program.dto.js';
import { DeactivateEducationalProgramDto } from './dto/deactivate-educational-program.dto.js';
import { ReplaceEducationalProgramDto } from './dto/replace-educational-program.dto.js';
import { UpdateEducationalProgramDto } from './dto/update-educational-program.dto.js';
import { EducationalProgramsService } from './educational-programs.service.js';

type AuthenticatedRequest = Request & { user: JwtPayload };

@ApiTags('Освітні програми')
@Auth('admin')
@Controller('educational-programs')
export class EducationalProgramsController {
  constructor(
    private readonly educationalProgramsService: EducationalProgramsService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Отримати список освітніх програм у межах зони відповідальності',
    description:
      'Для головного адміністратора повертає всі освітні програми університету; для адміністратора підрозділу — ОП кафедр у межах його піддерева разом зі списком доступних кафедр та активних спеціальностей.',
  })
  @ApiQuery({
    name: 'includeInactive',
    required: false,
    type: Boolean,
    description: 'Включити неактивні та замінені освітні програми',
  })
  findAll(
    @Req() req: AuthenticatedRequest,
    @Query('includeInactive') includeInactive?: string,
  ) {
    return this.educationalProgramsService.findAll(
      req.user.sub,
      includeInactive === 'true',
    );
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Отримати детальну інформацію про освітню програму',
  })
  findOne(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.educationalProgramsService.findOne(req.user.sub, id);
  }

  @Post()
  @ApiOperation({
    summary: 'Створити нову освітню програму',
  })
  create(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateEducationalProgramDto,
  ) {
    return this.educationalProgramsService.create(req.user.sub, dto);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Редагувати освітню програму на місці (виправлення одруківок)',
    description:
      'Для офіційного перейменування, переведення на іншу спеціальність чи злиття ОП зі збереженням історії груп використовуйте ендпоїнт заміни.',
  })
  update(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEducationalProgramDto,
  ) {
    return this.educationalProgramsService.update(req.user.sub, id, dto);
  }

  @Post(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Деактивувати освітню програму без правонаступника',
  })
  deactivate(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DeactivateEducationalProgramDto,
  ) {
    return this.educationalProgramsService.deactivate(req.user.sub, id, dto);
  }

  @Post(':id/activate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Повторно активувати деактивовану освітню програму',
  })
  activate(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.educationalProgramsService.activate(req.user.sub, id);
  }

  @Post(':id/replace')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Замінити (перейменувати або обʼєднати) освітню програму',
    description:
      'Деактивує поточну ОП і повʼязує її з новою або вже існуючою активною ОП-правонаступником; існуючі групи залишаються на старій ОП для збереження історії.',
  })
  replace(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReplaceEducationalProgramDto,
  ) {
    return this.educationalProgramsService.replace(req.user.sub, id, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Видалити порожню освітню програму',
  })
  async remove(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.educationalProgramsService.remove(req.user.sub, id);
    return { message: 'Освітню програму успішно видалено' };
  }
}
