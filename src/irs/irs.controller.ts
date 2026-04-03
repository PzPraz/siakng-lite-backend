import {
  Body,
  Controller,
  Post,
  UseGuards,
  Request,
  Param,
  Delete,
  Get,
} from '@nestjs/common';
import { IrsService } from './irs.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from 'src/common/types/authenticated-request.type';
import { SyncIrsDto } from './dto/sync-irs.dto';

@Controller('irs')
@UseGuards(JwtAuthGuard)
export class IrsController {
  constructor(private readonly irsService: IrsService) {}

  @Post('sync')
  async sync(
    @Request() req: AuthenticatedRequest,
    @Body() body: SyncIrsDto,
  ) {
    const userId = req.user.id;

    return this.irsService.sync(Number(userId), body.classIds);
  }

  @Get('my-irs')
  async getMyIrs(@Request() req: AuthenticatedRequest) {
    const userId = req.user.id;

    return this.irsService.getMyIrs(Number(userId));
  }

  @Delete('drop/:id')
  async dropIrs(
    @Request() req: AuthenticatedRequest,
    @Param('id') irsId: string,
  ) {
    const userId = req.user.id;
    return this.irsService.drop(Number(userId), Number(irsId));
  }
}
