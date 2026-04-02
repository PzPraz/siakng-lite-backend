import { Body, Controller, Patch, UseGuards, Post, Param, Get, Request, ParseIntPipe, Delete } from '@nestjs/common';
import { Roles } from 'src/auth/decorators/role.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { CreateGradeComponentDto } from './dto/create-grade-component.dto';
import { GradesService } from './grades.service';
import type { AuthenticatedRequest } from 'src/irs/irs.controller';
import { CreateGradeDto } from './dto/create-grade.dto';

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

  @Delete(':id')
  @Roles('DOSEN')
  async deleteComponent(@Param('id') id: string) {
    return this.gradesService.deleteComponent(Number(id));
  }

  @Patch(':classId/publish-status')
  @Roles('DOSEN')
  async updatePublishStatus(@Param('classId') classId: string, @Body() body: { isPublished: boolean}) {
    return this.gradesService.setPublishStatus(Number(classId), body.isPublished);
  }

  @Get(':classId/students/:studentId/grades')
  async getStudentGradeByClass(
    @Param('classId', ParseIntPipe) classId: number,
    @Param('studentId', ParseIntPipe) studentId: number,
    @Request() req: AuthenticatedRequest,
  ) {
    const currentUser = req.user; 

    return this.gradesService.getStudentGradeByClass(
      studentId, 
      classId, 
      currentUser
    );
  }

  @Post(':studentId')
  @Roles('DOSEN')
  async gradeStudent(@Body() body: CreateGradeDto[], @Param('studentId') id: string) {
    return this.gradesService.gradeStudent(Number(id), body);
  }
}
