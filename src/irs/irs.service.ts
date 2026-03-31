import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from 'src/database/database.module';
import * as schema from '../database/schema';
import { eq, and, sql } from 'drizzle-orm';
import { NotFoundException } from '@nestjs/common';

@Injectable()
export class IrsService {
  constructor(@Inject(DRIZZLE) private db: PostgresJsDatabase<typeof schema>) {}

  async enroll(studentId: number, classIds: number[]) {
    return await this.db.transaction(async (tx) => {
      const results: (typeof schema.irs.$inferSelect)[] = [];

      for (const classId of classIds) {
        const classData = await tx
          .select({
            id: schema.classes.id,
            kapasitas: schema.classes.kapasitas,
            courseId: schema.classes.courseId,
            sks: schema.courses.sks,
          })
          .from(schema.classes)
          .innerJoin(
            schema.courses,
            eq(schema.classes.courseId, schema.courses.id),
          )
          .where(eq(schema.classes.id, classId))
          .limit(1);
  
        if (classData.length === 0) {
          throw new BadRequestException('Kelas tidak ditemukan');
        }
        const target = classData[0];
  
        const currentIrs = await tx
          .select({
            sks: schema.courses.sks,
          })
          .from(schema.irs)
          .innerJoin(schema.classes, eq(schema.irs.classId, schema.classes.id))
          .innerJoin(
            schema.courses,
            eq(schema.classes.courseId, schema.courses.id),
          )
          .where(eq(schema.irs.studentId, studentId));
  
        const totalSksSekarang = currentIrs.reduce(
          (acc, curr) => acc + curr.sks,
          0,
        );
  
        const BATAS_MAKSIMAL_SKS = 24;
        if (totalSksSekarang + target.sks > BATAS_MAKSIMAL_SKS) {
          throw new BadRequestException(
            `Batas SKS terlampaui! SKS saat ini: ${totalSksSekarang}, ditambah matkul ini (${target.sks}) akan menjadi ${totalSksSekarang + target.sks}. (Maksimal: ${BATAS_MAKSIMAL_SKS})`,
          );
        }
  
        const targetClass = classData[0];
  
        const currentEnrolled = await tx
          .select({ count: sql<number>`count(*)` })
          .from(schema.irs)
          .where(eq(schema.irs.classId, classId));
  
        if (Number(currentEnrolled[0].count) >= targetClass.kapasitas) {
          throw new BadRequestException('Kapasitas kelas sudah penuh');
        }
  
        const duplicateCourse = await tx
          .select()
          .from(schema.irs)
          .innerJoin(schema.classes, eq(schema.irs.classId, schema.classes.id))
          .where(
            and(
              eq(schema.irs.studentId, studentId),
              eq(schema.classes.courseId, targetClass.courseId),
            ),
          );
  
        if (duplicateCourse.length > 0) {
          throw new BadRequestException(
            'Anda sudah terdaftar di mata kuliah ini (pada kelas lain)',
          );
        }
  
        const result = await tx
          .insert(schema.irs)
          .values({
            studentId: studentId,
            classId: classId,
            status: 'PENDING',
          })
          .returning();

        results.push(result[0]);
      }
      
      return results;
    });
  }

  async getMyIrs(studentId: number) {
    return await this.db
      .select({
        id: schema.irs.id,
        status: schema.irs.status,
        createdAt: schema.irs.createdAt,
        namaKelas: schema.classes.namaKelas,
        jadwal: schema.classes.jadwal,
        namaMatkul: schema.courses.nama,
        kodeMatkul: schema.courses.kode,
        sks: schema.courses.sks,
      })
      .from(schema.irs)
      .innerJoin(schema.classes, eq(schema.irs.classId, schema.classes.id))
      .innerJoin(schema.courses, eq(schema.classes.courseId, schema.courses.id))
      .where(eq(schema.irs.studentId, studentId));
  }

  async drop(studentId: number, irsId: number) {
    return await this.db.transaction(async (tx) => {
      const record = await tx
        .select()
        .from(schema.irs)
        .where(
          and(eq(schema.irs.id, irsId), eq(schema.irs.studentId, studentId)),
        )
        .limit(1);

      if (record.length === 0) {
        throw new NotFoundException('Data matkul di IRS tidak ditemukan');
      }

      const target = record[0];

      if (target.status === 'APPROVED') {
        throw new BadRequestException(
          'Mata kuliah sudah disetujui (APPROVED). Silakan hubungi Dosen PA untuk melakukan perubahan.',
        );
      }

      const deleted = await tx
        .delete(schema.irs)
        .where(eq(schema.irs.id, irsId))
        .returning();

      return {
        message: 'Mata kuliah berhasil dihapus dari IRS',
        droppedItem: deleted[0],
      };
    });
  }
}
