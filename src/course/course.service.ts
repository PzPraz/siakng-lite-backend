import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from 'src/database/database.module';
import * as schema from '../database/schema';
import { CreateCourseDto } from './dto/create-course.dto';
import { eq, or, ne, and } from 'drizzle-orm';

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
    const rows = await this.db
      .select({
        // Data Course
        courseId: schema.courses.id,
        nama: schema.courses.nama,
        kode: schema.courses.kode,
        sks: schema.courses.sks,
        // Data Kelas
        classId: schema.classes.id,
        namaKelas: schema.classes.namaKelas,
        jadwal: schema.classes.jadwal,
        kapasitas: schema.classes.kapasitas,
        namaDosen: schema.users.nama,
      })
      .from(schema.courses)
      .leftJoin(schema.classes, eq(schema.classes.courseId, schema.courses.id))
      .leftJoin(
        schema.users,
        eq(schema.classes.dosenId, schema.users.npm_atau_nip),
      )
      .where(eq(schema.courses.id, id));

    if (rows.length === 0) return null;

    const result = {
      id: rows[0].courseId,
      nama: rows[0].nama,
      kode: rows[0].kode,
      sks: rows[0].sks,
      classes: rows
        .filter((row) => row.classId !== null)
        .map((row) => ({
          id: row.classId,
          namaKelas: row.namaKelas,
          jadwal: row.jadwal,
          kapasitas: row.kapasitas,
          namaDosen: row.namaDosen,
        })),
    };

    return result;
  }
}
