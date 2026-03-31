import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE } from 'src/database/database.module';
import * as schema from '../database/schema';
import { eq, sql, and } from 'drizzle-orm';
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
        dosenId: schema.classes.dosenId,
        namaDosen: schema.users.nama,
        courseId: schema.classes.courseId,
        terisi: sql<number>`(SELECT count(*) FROM ${schema.irs} WHERE ${schema.irs.classId} = ${schema.classes.id})`,
      })
      .from(schema.classes)
      .innerJoin(schema.courses, eq(schema.classes.courseId, schema.courses.id))
      .leftJoin(
        schema.users,
        eq(schema.classes.dosenId, schema.users.npm_atau_nip),
      );
  }

  async create(dto: CreateClassDto) {
    const dosen = await this.db.query.users.findFirst({
      where: and(
        eq(schema.users.npm_atau_nip, dto.dosenId),
        eq(schema.users.role, 'DOSEN'),
      ),
    });

    if (!dosen) {
      throw new NotFoundException(
        `Dosen dengan NIP ${dto.dosenId} tidak ditemukan atau tidak memiliki akses mengajar`,
      );
    }

    const newClass = await this.db
      .insert(schema.classes)
      .values(dto)
      .returning();

    return newClass[0];
  }

  async update(id: number, dto: Partial<CreateClassDto>) {
    if (dto.dosenId) {
      const dosen = await this.db.query.users.findFirst({
        where: and(
          eq(schema.users.npm_atau_nip, dto.dosenId),
          eq(schema.users.role, 'DOSEN'),
        ),
      });

      if (!dosen) {
        throw new NotFoundException(
          `Dosen dengan NIP ${dto.dosenId} tidak ditemukan`,
        );
      }
    }

    const updated = await this.db
      .update(schema.classes)
      .set(dto)
      .where(eq(schema.classes.id, id))
      .returning();

    if (updated.length === 0) {
      throw new NotFoundException(`Kelas dengan ID ${id} tidak ditemukan`);
    }

    return updated[0];
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
        npm: schema.users.npm_atau_nip,
        nama: schema.users.nama,
      })
      .from(schema.irs)
      .innerJoin(schema.users, eq(schema.irs.studentId, schema.users.id))
      .where(eq(schema.irs.classId, classId));

    return students;
  }

  async getDosenClasses(dosenNip: string) {
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
      .where(eq(schema.classes.dosenId, dosenNip));
  }

  async getClassById(classId: number) {
    const rows = await this.db
      .select({
        id: schema.classes.id,
        namaKelas: schema.classes.namaKelas,
        jadwal: schema.classes.jadwal,
        courseId: schema.classes.courseId,
        namaMatkul: schema.courses.nama,
        sks: schema.courses.sks,
        dosenId: schema.classes.dosenId,
        namaDosen: schema.users.nama,
        terisi:
          sql<number>`(SELECT count(*) FROM ${schema.irs} WHERE ${schema.irs.classId} = ${schema.classes.id})`.mapWith(
            Number,
          ),
        kapasitas: schema.classes.kapasitas,
      })
      .from(schema.classes)
      .innerJoin(schema.courses, eq(schema.classes.courseId, schema.courses.id))
      .leftJoin(
        schema.users,
        eq(schema.classes.dosenId, schema.users.npm_atau_nip),
      )
      .where(eq(schema.classes.id, classId));

    return rows[0];
  }
}
