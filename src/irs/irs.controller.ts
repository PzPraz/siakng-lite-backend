import {
  Body,
  Controller,
  Post,
  UseGuards,
  Request,
  Get,
} from '@nestjs/common';
import { IrsService } from './irs.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EnrollIrsDto } from './dto/enroll-irs.dto';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
  };
}

@Controller('irs')
@UseGuards(JwtAuthGuard)
export class IrsController {
  constructor(private readonly irsService: IrsService) {}

  @Post('enroll')
  async enroll(
    @Request() req: AuthenticatedRequest,
    @Body() enrollIrsDto: EnrollIrsDto,
  ) {
    const userId = req.user.id;

    return this.irsService.enroll(userId, enrollIrsDto.classId);
  }

  @Get('my-irs')
  async getMyIrs(@Request() req: AuthenticatedRequest) {
    const userId = req.user.id;

    return this.irsService.getMyIrs(userId);
  }
}
