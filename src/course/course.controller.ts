import {
  Controller,
  Get,
  Post,
  Body,
  Delete,
  Param,
  UseGuards,
  Patch,
} from '@nestjs/common';
import { CourseService } from './course.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from 'src/auth/decorators/role.decorator';
import { RolesGuard } from 'src/auth/guards/roles.guard';

@Controller('course')
// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
@UseGuards(JwtAuthGuard, RolesGuard)
export class CourseController {
  constructor(private readonly courseService: CourseService) {}

  @Get()
  async getAll() {
    return this.courseService.findAll();
  }

  @Post()
  @Roles('DOSEN')
  async create(@Body() createCourseDto: CreateCourseDto) {
    return this.courseService.create(createCourseDto);
  }

  @Delete(':id')
  @Roles('DOSEN')
  async remove(@Param('id') id: string) {
    return this.courseService.delete(+id);
  }

  @Patch(':id')
  @Roles('DOSEN')
  async update(@Param('id') id: string, @Body() updateData: CreateCourseDto) {
    return this.courseService.edit(+id, updateData);
  }
}
