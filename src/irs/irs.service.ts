import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from 'src/database/database.module';
import * as schema from '../database/schema';
import { eq, and, sql, inArray, exists } from 'drizzle-orm';
import { NotFoundException } from '@nestjs/common';

@Injectable()
export class IrsService {
  constructor(@Inject(DRIZZLE) private db: PostgresJsDatabase<typeof schema>) {}

  async sync(studentId: number, newClassIds: number[]) {
    // --- VALIDASI INPUT ---
    if (!newClassIds || !Array.isArray(newClassIds)) {
      throw new BadRequestException('Daftar kelas tidak boleh kosong atau format tidak valid');
    }
    const uniqueNewClassIds = [...new Set(newClassIds)];

    return await this.db.transaction(async (tx) => {
      const oldIrs = await tx
        .select()
        .from(schema.irs)
        .where(eq(schema.irs.studentId, studentId));

      const oldClassIds = oldIrs.map((item) => item.classId);

      const idsToDelete = oldIrs
        .filter((item) => !uniqueNewClassIds.includes(item.classId))
        .map((item) => item.id);

      const idsToAdd = uniqueNewClassIds.filter((id) => !oldClassIds.includes(id));

    // --- VALIDASI PENGHAPUSAN ---
    if (idsToDelete.length > 0) {
      const hasApproved = oldIrs.some(
        (item) => idsToDelete.includes(item.id) && item.status === 'APPROVED',
      );
      if (hasApproved)
        throw new BadRequestException('Tidak bisa mengubah matkul yang sudah disetujui');
      
      await tx.delete(schema.irs).where(inArray(schema.irs.id, idsToDelete));
    }

    if (idsToAdd.length === 0) return { message: 'IRS berhasil disinkronisasi' };


    const classesToAddData = await tx
      .select({
        id: schema.classes.id,
        kapasitas: schema.classes.kapasitas,
        courseId: schema.classes.courseId,
        namaMatkul: schema.courses.nama,
        sks: schema.courses.sks,
      })
      .from(schema.classes)
      .innerJoin(schema.courses, eq(schema.classes.courseId, schema.courses.id))
      .where(inArray(schema.classes.id, idsToAdd));

    // --- VALIDASI KELAS DITEMUKAN ---
    if (classesToAddData.length !== idsToAdd.length) {
      const foundIds = classesToAddData.map((c) => c.id);
      const notFound = idsToAdd.filter((id) => !foundIds.includes(id));
      throw new BadRequestException(`Kelas dengan ID ${notFound.join(', ')} tidak ditemukan`);
    }

    const schedulesToAdd = await tx
      .select()
      .from(schema.classSchedules)
      .where(inArray(schema.classSchedules.classId, idsToAdd));

    const remainingIrs = await tx
      .select({
        classId: schema.classes.id,
        courseId: schema.classes.courseId,
        namaMatkul: schema.courses.nama,
        sks: schema.courses.sks,
      })
      .from(schema.irs)
      .innerJoin(schema.classes, eq(schema.irs.classId, schema.classes.id))
      .innerJoin(schema.courses, eq(schema.classes.courseId, schema.courses.id))
      .where(eq(schema.irs.studentId, studentId));

    const remainingSchedules = await tx
      .select({
        namaMatkul: schema.courses.nama,
        hari: schema.classSchedules.hari,
        jamMulai: schema.classSchedules.jamMulai,
        jamSelesai: schema.classSchedules.jamSelesai,
      })
      .from(schema.irs)
      .innerJoin(schema.classes, eq(schema.irs.classId, schema.classes.id))
      .innerJoin(schema.courses, eq(schema.classes.courseId, schema.courses.id))
      .innerJoin(schema.classSchedules, eq(schema.classes.id, schema.classSchedules.classId))
      .where(eq(schema.irs.studentId, studentId));

    const totalSksRemaining = remainingIrs.reduce((acc, curr) => acc + curr.sks, 0);
    const sksToAdd = classesToAddData.reduce((acc, curr) => acc + curr.sks, 0);
    const BATAS_MAKSIMAL_SKS = 24;

    if (totalSksRemaining + sksToAdd > BATAS_MAKSIMAL_SKS) {
      throw new BadRequestException(`Batas SKS terlampaui! Total akan menjadi ${totalSksRemaining + sksToAdd} SKS.`);
    }

    for (const cls of classesToAddData) {
      if (remainingIrs.some(r => r.courseId === cls.courseId)) {
        throw new BadRequestException(`Anda sudah terdaftar di mata kuliah ${cls.namaMatkul}`);
      }
    }

    for (const newSched of schedulesToAdd) {
      const matkulBaru = classesToAddData.find(c => c.id === newSched.classId);
      
      for (const existSched of remainingSchedules) {
        if (newSched.hari === existSched.hari) {
          const isOverlap = newSched.jamMulai < existSched.jamSelesai && newSched.jamSelesai > existSched.jamMulai;
          if (isOverlap) {
            throw new BadRequestException(`Jadwal bentrok: ${matkulBaru?.namaMatkul} dengan ${existSched.namaMatkul}`);
          }
        }
      }
    }

    // Cek bentrok antar kelas baru
    for (let i = 0; i < schedulesToAdd.length; i++) {
      for (let j = i + 1; j < schedulesToAdd.length; j++) {
        const a = schedulesToAdd[i];
        const b = schedulesToAdd[j];
        if (a.classId !== b.classId && a.hari === b.hari) {
          const isOverlap = a.jamMulai < b.jamSelesai && a.jamSelesai > b.jamMulai;
          if (isOverlap) {
            const matkulA = classesToAddData.find(c => c.id === a.classId);
            const matkulB = classesToAddData.find(c => c.id === b.classId);
            throw new BadRequestException(
              `Jadwal bentrok antar kelas baru: ${matkulA?.namaMatkul} dengan ${matkulB?.namaMatkul}`
            );
          }
        }
      }
    }

    for (const classId of idsToAdd) {
      // Lock baris kelas untuk mencegah race condition saat mengecek kapasitas
      await tx
        .select({ id: schema.classes.id })
        .from(schema.classes)
        .where(eq(schema.classes.id, classId))
        .for('update');

      const currentEnrolled = await tx
        .select({ count: sql<number>`count(*)` })
        .from(schema.irs)
        .where(eq(schema.irs.classId, classId));

      const target = classesToAddData.find(c => c.id === classId);
      if (Number(currentEnrolled[0].count) >= target!.kapasitas) {
        throw new BadRequestException(`Kelas ${target!.namaMatkul} sudah penuh`);
      }
    }

    if (idsToAdd.length > 0) {
      await tx.insert(schema.irs).values(
        idsToAdd.map((classId) => ({
          studentId,
          classId,
          status: 'PENDING',
        }))
      );
    }

    return { message: 'IRS berhasil disinkronisasi' };
  });
}

  async getMyIrs(studentId: number) {
    return await this.db
      .select({
        id: schema.irs.id,
        status: schema.irs.status,
        createdAt: schema.irs.createdAt,
        namaKelas: schema.classes.namaKelas,
        namaMatkul: schema.courses.nama,
        kodeMatkul: schema.courses.kode,
        sks: schema.courses.sks,
        classId: schema.classes.id,
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
        .where(and(eq(schema.irs.id, irsId), eq(schema.irs.studentId, studentId)))
        .returning();

      return {
        message: 'Mata kuliah berhasil dihapus dari IRS',
        droppedItem: deleted[0],
      };
    });
  }
}
