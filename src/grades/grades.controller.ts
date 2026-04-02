import { Body, Controller, Patch, UseGuards, Post, Param, Get } from '@nestjs/common';
import { Roles } from 'src/auth/decorators/role.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { CreateGradeComponentDto } from './dto/create-grade-component.dto';
import { GradesService } from './grades.service';


@Controller('grades')
@UseGuards(JwtAuthGuard, RolesGuard)
export class GradesController {
  constructor(private readonly gradesService: GradesService) {}

  @Get('/components/:id')
  @Roles('DOSEN')
  async getGradeComponents(@Param('id') id: string) {
    return this.gradesService.getGradeComponents(Number(id));
  }

  @Post('')
  @Roles('DOSEN')
  async createComponent(@Body() payload: CreateGradeComponentDto) {
    return this.gradesService.createComponent(payload);
  }

  @Patch(':id')
  @Roles('DOSEN')
  async editComponent(@Body() payload: CreateGradeComponentDto, @Param('id') id: string) {
    return this.gradesService.editComponent(Number(id), payload);
  }
}
