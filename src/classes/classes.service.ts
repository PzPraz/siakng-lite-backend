import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE } from 'src/database/database.module';
import * as schema from '../database/schema';
import { eq, sql } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { CreateClassDto } from './dto/create-class.dto';
import { NotFoundException } from '@nestjs/common';

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

  async create(dto: CreateClassDto) {
    const user = await this.db.query.users.findFirst({
      where: eq(schema.users.npm_atau_nip, dto.dosenId),
    });

    if (!user) {
      throw new NotFoundException(
        `Dosen dengan NIP ${dto.dosenId} tidak ditemukan di sistem`,
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { dosenId, ...classData } = dto;

    const newClass = await this.db
      .insert(schema.classes)
      .values({
        ...classData,
        dosenId: user.id,
      })
      .returning();

    return newClass[0];
  }

  async update(id: number, dto: Partial<CreateClassDto>) {
    const updateData: CreateClassDto = { ...dto };

    if (dto.dosenId) {
      const user = await this.db.query.users.findFirst({
        where: eq(schema.users.npm_atau_nip, dto.dosenId),
      });

      if (!user) {
        throw new NotFoundException(
          `Dosen dengan NIP ${dto.dosenId} tidak ditemukan di sistem`,
        );
      }

      updateData.dosenId = user.id;
    }

    if (typeof updateData.dosenId === 'string') {
      delete updateData.dosenId;
    }

    return await this.db
      .update(schema.classes)
      .set(updateData)
      .where(eq(schema.classes.id, id))
      .returning();
  }

  async delete(id: number) {
    const deleted = await this.db
      .delete(schema.classes)
      .where(eq(schema.classes.id, id))
      .returning();

    if (deleted.length === 0) {
      throw new NotFoundException(`Kelas dengan ID ${id} tidak ditemukan`);
    }

    return {
      message:
        'Kelas dan seluruh data pendaftaran (IRS) terkait berhasil dihapus',
      data: deleted[0],
    };
  }

  async getStudentsInClass(classId: number) {
    const students = await this.db
      .select({
        id: schema.users.id,
        npm: schema.users.npm_atau_nip,
        nama: schema.users.nama,
        statusIrs: schema.irs.status,
        enrolledAt: schema.irs.createdAt,
      })
      .from(schema.irs)
      .innerJoin(schema.users, eq(schema.irs.studentId, schema.users.id))
      .where(eq(schema.irs.classId, classId));

    return students;
  }

  async getDosenClasses(dosenId: string) {
    const user = await this.db.query.users.findFirst({
      where: eq(schema.users.npm_atau_nip, dosenId),
    });

    if (!user) {
      throw new NotFoundException(
        `Dosen dengan NIP ${dosenId} tidak ditemukan di sistem`,
      );
    }

    return await this.db
      .select({
        id: schema.classes.id,
        namaKelas: schema.classes.namaKelas,
        namaMatkul: schema.courses.nama,
        kapasitas: schema.classes.kapasitas,
        terisi: sql<number>`(SELECT count(*) FROM ${schema.irs} WHERE ${schema.irs.classId} = ${schema.classes.id})`,
      })
      .from(schema.classes)
      .innerJoin(schema.courses, eq(schema.classes.courseId, schema.courses.id))
      .where(eq(schema.classes.dosenId, user.id));
  }
}
