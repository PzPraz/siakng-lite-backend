import { Module } from '@nestjs/common';
import { IrsController } from './irs.controller';
import { IrsService } from './irs.service';

@Module({
  controllers: [IrsController],
  providers: [IrsService],
})
export class IrsModule {}
