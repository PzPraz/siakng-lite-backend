import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from 'src/database/database.module';
import * as schema from '../database/schema';
import { CreateCourseDto } from './dto/create-course.dto';
import { eq, or, ne, and, sql } from 'drizzle-orm';

@Injectable()
export class CourseService {
  constructor(@Inject(DRIZZLE) private db: PostgresJsDatabase<typeof schema>) {}

  async findAll() {
    return await this.db.select().from(schema.courses);
  }

  async create(data: CreateCourseDto) {
    const existingCourse = await this.db.query.courses.findFirst({
      where: or(
        eq(schema.courses.kode, data.kode),
        eq(schema.courses.nama, data.nama)
      ),
    });

    if (existingCourse) {
      const field = existingCourse.kode === data.kode ? 'Kode' : 'Nama';
      throw new BadRequestException(`Mata kuliah dengan ${field} tersebut sudah terdaftar di sistem.`);
    }

    return await this.db.insert(schema.courses).values(data).returning();
}

  async delete(id: number) {
    const existingCourse = await this.db.query.courses.findFirst({
      where: eq(schema.courses.id, id)
    });

    if (!existingCourse) throw new BadRequestException(`Mata kuliah tidak ditemukan`)

    return await this.db
      .delete(schema.courses)
      .where(eq(schema.courses.id, id));
  }

  async edit(id: number, updateData: CreateCourseDto) {
    const duplicate = await this.db.query.courses.findFirst({
      where: and(
        ne(schema.courses.id, id),
        or(
          eq(schema.courses.kode, updateData.kode),
          eq(schema.courses.nama, updateData.nama)
        )
      ),
    });

    if (duplicate) {
      const field = duplicate.kode === updateData.kode ? 'Kode' : 'Nama';
      throw new BadRequestException(`${field} mata kuliah sudah digunakan oleh data lain.`);
    }

    return await this.db
      .update(schema.courses)
      .set(updateData)
      .where(eq(schema.courses.id, id))
      .returning();
  }

  async getById(id: number) {
    const courseData = await this.db.query.courses.findFirst({
      where: eq(schema.courses.id, id),
      with: {
        classes: {
          with: {
            dosen: true,
            schedules: true,
          },
        },
      },
    });

    if (!courseData) throw new BadRequestException(`Mata kuliah tidak ditemukan`);

    const classesWithStats = await Promise.all(
      courseData.classes.map(async (cls) => {
        const enrolled = await this.db
          .select({ count: sql<number>`count(*)` })
          .from(schema.irs)
          .where(eq(schema.irs.classId, cls.id));

        return {
          id: cls.id,
          namaKelas: cls.namaKelas,
          kapasitas: cls.kapasitas,
          namaDosen: cls.dosen?.nama ?? 'Staf Pengajar',
          terisi: Number(enrolled[0]?.count ?? 0),
          schedules: cls.schedules,
        };
      })
    );

    return {
      id: courseData.id,
      nama: courseData.nama,
      kode: courseData.kode,
      sks: courseData.sks,
      classes: classesWithStats,
    };
  }
}
