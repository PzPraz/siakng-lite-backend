import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { DRIZZLE } from 'src/database/database.module';
import * as schema from '../database/schema';
import { eq, sql, and, ne, lt, gt } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { CreateClassDto } from './dto/create-class.dto';
import { NotFoundException, ConflictException } from '@nestjs/common';

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

    return await this.db.transaction(async (tx) => {
      const dosen = await tx.query.users.findFirst({
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
  
      const existingClass = await tx.query.classes.findFirst({
        where: and(
          eq(schema.classes.courseId, dto.courseId),
          eq(schema.classes.namaKelas, dto.namaKelas),
        ),
      });
  
      if (existingClass) {
        throw new ConflictException(
          `Kelas "${dto.namaKelas}" sudah ada untuk mata kuliah ini.`,
        );
      }

      if (dto.schedules.length > 0) {
        // Cek duplikasi/bentrok jadwal di dalam payload DTO itu sendiri
        for (let i = 0; i < dto.schedules.length; i++) {
          for (let j = i + 1; j < dto.schedules.length; j++) {
            const a = dto.schedules[i];
            const b = dto.schedules[j];
            
            if (a.hari === b.hari) {
              const isOverlap = a.jamMulai < b.jamSelesai && a.jamSelesai > b.jamMulai;
              if (isOverlap) {
                throw new BadRequestException(`Terdapat jadwal yang saling bentrok atau duplikat di dalam input: Hari ${a.hari} Jam ${a.jamMulai}-${a.jamSelesai} dengan Jam ${b.jamMulai}-${b.jamSelesai}`);
              }
            }
          }
        }

        for (const sched of dto.schedules) {
          const overlap = await tx.query.classSchedules.findFirst({
            where: and(
              eq(schema.classSchedules.ruangan, sched.ruangan),
              eq(schema.classSchedules.hari, sched.hari),
              lt(schema.classSchedules.jamMulai, sched.jamSelesai),
              gt(schema.classSchedules.jamSelesai, sched.jamMulai),
            ),
            with: {
              class: {
                with: { course: true }
              }
            }
          })

          if (overlap) throw new BadRequestException(`Ruang ${sched.ruangan} sudah digunakan kelas lain`)
        }
      }

      const { schedules, ...classPayload } = dto; 
      
      const [insertedClass] = await tx
        .insert(schema.classes)
        .values(classPayload)
        .returning();

      if (schedules && schedules.length > 0) {
        const schedulesToInsert = schedules.map(s => ({
          classId: insertedClass.id,
          hari: s.hari,
          jamMulai: s.jamMulai,
          jamSelesai: s.jamSelesai,
          ruangan: s.ruangan
        }));
        await tx.insert(schema.classSchedules).values(schedulesToInsert);
      }

      return insertedClass;
    })
  }

  async update(id: number, dto: Partial<CreateClassDto>) {
    return await this.db.transaction(async(tx) => {
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
  
      if (dto.namaKelas || dto.courseId) {
        const currentClass = await this.db.query.classes.findFirst({
          where: eq(schema.classes.id, id),
        });
  
        if (!currentClass) {
          throw new NotFoundException(`Kelas dengan ID ${id} tidak ditemukan`);
        }
  
        const targetCourseId = dto.courseId ?? currentClass.courseId;
        const targetNamaKelas = dto.namaKelas ?? currentClass.namaKelas;
  
        const duplicate = await this.db.query.classes.findFirst({
          where: and(
            eq(schema.classes.courseId, targetCourseId),
            eq(schema.classes.namaKelas, targetNamaKelas),
            ne(schema.classes.id, id),
          ),
        });
  
        if (duplicate) {
          throw new ConflictException(
            `Nama kelas "${targetNamaKelas}" sudah digunakan di mata kuliah ini.`,
          );
        }
      }
  
      if (dto.schedules) {
        // Cek duplikasi/bentrok jadwal di dalam payload DTO itu sendiri
        for (let i = 0; i < dto.schedules.length; i++) {
          for (let j = i + 1; j < dto.schedules.length; j++) {
            const a = dto.schedules[i];
            const b = dto.schedules[j];
            
            if (a.hari === b.hari) {
              const isOverlap = a.jamMulai < b.jamSelesai && a.jamSelesai > b.jamMulai;
              if (isOverlap) {
                throw new BadRequestException(`Terdapat jadwal yang saling bentrok atau duplikat di dalam input: Hari ${a.hari} Jam ${a.jamMulai}-${a.jamSelesai} dengan Jam ${b.jamMulai}-${b.jamSelesai}`);
              }
            }
          }
        }

        for (const sched of dto.schedules) {
          const overlap = await tx.query.classSchedules.findFirst({
            where: and(
              eq(schema.classSchedules.ruangan, sched.ruangan),
              eq(schema.classSchedules.hari, sched.hari),
              lt(schema.classSchedules.jamMulai, sched.jamSelesai),
              gt(schema.classSchedules.jamSelesai, sched.jamMulai),
              ne(schema.classSchedules.classId, id)
            ),
          });
  
          if (overlap) {
            throw new ConflictException(`Ruangan ${sched.ruangan} sudah digunakan pada kelas lain di waktu tersebut.`);
          }
        }

        await tx.delete(schema.classSchedules).where(eq(schema.classSchedules.classId, id));
    

        if (dto.schedules.length > 0) {
          const schedulesToInsert = dto.schedules.map(s => ({
            ...s,
            classId: id,
          }));
          await tx.insert(schema.classSchedules).values(schedulesToInsert);
        }
      }
    
      const { schedules, ...updatePayload } = dto;
      
      if (Object.keys(updatePayload).length > 0) {
        const updated = await tx
          .update(schema.classes)
          .set(updatePayload)
          .where(eq(schema.classes.id, id))
          .returning();

        if (updated.length === 0) {
          throw new NotFoundException(`Kelas dengan ID ${id} tidak ditemukan`);
        }
        return updated[0];
      }

      return { id, message: "Jadwal berhasil diperbarui." };
    });
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
        jadwal: schema.classes.jadwal,
        sks: schema.courses.sks,
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
        kodeMatkul: schema.courses.kode,
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
