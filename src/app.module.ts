import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { CourseModule } from './course/course.module';
import { IrsModule } from './irs/irs.module';
import { ClassesModule } from './classes/classes.module';
import { GradesModule } from './grades/grades.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    DatabaseModule,
    CourseModule,
    IrsModule,
    ClassesModule,
    GradesModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
