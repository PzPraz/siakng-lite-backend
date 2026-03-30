import { Inject, Injectable } from '@nestjs/common';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from 'src/database/database.module';
import * as schema from '../database/schema';
import { CreateCourseDto } from './dto/create-course.dto';
import { eq } from 'drizzle-orm';

@Injectable()
export class CourseService {
  constructor(@Inject(DRIZZLE) private db: PostgresJsDatabase<typeof schema>) {}

  async findAll() {
    return await this.db.select().from(schema.courses);
  }

  async create(data: CreateCourseDto) {
    return await this.db.insert(schema.courses).values(data).returning();
  }

  async delete(id: number) {
    return await this.db
      .delete(schema.courses)
      .where(eq(schema.courses.id, id));
  }

  async edit(id: number, updateData: CreateCourseDto) {
    return await this.db
      .update(schema.courses)
      .set(updateData)
      .where(eq(schema.courses.id, id))
      .returning();
  }
}
