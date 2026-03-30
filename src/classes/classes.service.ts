import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE } from 'src/database/database.module';
import * as schema from '../database/schema';
import { eq, sql } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

@Injectable()
export class ClassesService {
  constructor(@Inject(DRIZZLE) private db: PostgresJsDatabase<typeof schema>) {}

  async findAll() {
    return await this.db
      .select({
        id: schema.classes.id,
        namaKelas: schema.classes.namaKelas,
        jadwal: schema.classes.jadwal,
        kapasitas: schema.classes.kapasitas,
        namaMatkul: schema.courses.nama,
        sks: schema.courses.sks,
        terisi: sql<number>`(SELECT count(*) FROM ${schema.irs} WHERE ${schema.irs.classId} = ${schema.classes.id})`,
      })
      .from(schema.classes)
      .innerJoin(
        schema.courses,
        eq(schema.classes.courseId, schema.courses.id),
      );
  }
}
