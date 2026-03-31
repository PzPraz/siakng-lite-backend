import {
  Body,
  Controller,
  UseGuards,
  Post,
  Param,
  Patch,
  Get,
  Delete,
} from '@nestjs/common';
import { ClassesService } from './classes.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { CreateClassDto } from './dto/create-class.dto';
import { Roles } from 'src/auth/decorators/role.decorator';

@Controller('classes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  @Get('dosen/:dosenId')
  @Roles('DOSEN')
  async getDosenClasses(@Param('dosenId') dosenId: string) {
    return this.classesService.getDosenClasses(dosenId);
  }

  @Get(':id/students')
  @Roles('DOSEN')
  async getStudents(@Param('id') classId: string) {
    return this.classesService.getStudentsInClass(Number(classId));
  }

  @Get()
  async getAllClasses() {
    return this.classesService.findAll();
  }

  @Get(':id')
  async getClassById(@Param('id') classId: string) {
    return this.classesService.getClassById(Number(classId));
  }

  @Post()
  @Roles('DOSEN')
  async create(@Body() createClassDto: CreateClassDto) {
    return this.classesService.create(createClassDto);
  }

  @Patch(':id')
  @Roles('DOSEN')
  async update(
    @Param('id') id: string,
    @Body() createClassDto: Partial<CreateClassDto>,
  ) {
    return this.classesService.update(Number(id), createClassDto);
  }

  @Delete(':id')
  @Roles('DOSEN')
  async delete(@Param('id') id: string) {
    return this.classesService.delete(Number(id));
  }
}
