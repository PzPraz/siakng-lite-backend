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
    const data = await this.db.query.classes.findMany({
      with: { course: true, dosen: true, schedules: true },
    });

    const stats = await this.db
      .select({
        classId: schema.irs.classId,
        count: sql<number>`count(*)`
      })
      .from(schema.irs)
      .groupBy(schema.irs.classId);

    const statsMap = new Map(stats.map(s => [s.classId, Number(s.count)]));

    return data.map((c) => ({
      id: c.id,
      namaKelas: c.namaKelas,
      jadwal: c.jadwal,
      kapasitas: c.kapasitas,
      courseId: c.courseId,
      namaMatkul: c.course.nama,
      kodeMatkul: c.course.kode,
      sks: c.course.sks,
      dosenId: c.dosenId,
      namaDosen: c.dosen?.nama ?? 'Staf Pengajar',
      schedules: c.schedules,
      terisi: statsMap.get(c.id) ?? 0,
    }));
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
    const data = await this.db.query.classes.findMany({
      where: eq(schema.classes.dosenId, dosenNip),
      with: {
        course: true,
        schedules: true,
      },
    });

    const stats = await this.db
      .select({
        classId: schema.irs.classId,
        count: sql<number>`count(*)`
      })
      .from(schema.irs)
      .groupBy(schema.irs.classId);

    const statsMap = new Map(stats.map(s => [s.classId, Number(s.count)]));

    return data.map((c) => ({
      id: c.id,
      namaKelas: c.namaKelas,
      namaMatkul: c.course.nama,
      kapasitas: c.kapasitas,
      jadwal: c.jadwal,
      sks: c.course.sks,
      terisi: statsMap.get(c.id) ?? 0,
      schedules: c.schedules,
    }));
  }

  async getClassById(classId: number) {
    const result = await this.db.query.classes.findFirst({
      where: eq(schema.classes.id, classId),
      with: {
        course: true,
        dosen: true,
        schedules: true,
      },
    });

    if (!result) {
      throw new NotFoundException(`Kelas dengan ID ${classId} tidak ditemukan`);
    }

    const enrolledCount = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(schema.irs)
      .where(eq(schema.irs.classId, classId));

    return {
      id: result.id,
      namaKelas: result.namaKelas,
      jadwal: result.jadwal,
      courseId: result.courseId,
      namaMatkul: result.course.nama,
      sks: result.course.sks,
      kodeMatkul: result.course.kode,
      dosenId: result.dosenId,
      namaDosen: result.dosen?.nama ?? 'Staf Pengajar',
      kapasitas: result.kapasitas,
      terisi: Number(enrolledCount[0]?.count ?? 0),
      schedules: result.schedules,
    };
  }
}
