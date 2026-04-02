import { Injectable, BadRequestException, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { DRIZZLE } from 'src/database/database.module';
import * as schema from '../database/schema';
import { eq, and, ne, ilike, inArray} from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { CreateGradeComponentDto } from './dto/create-grade-component.dto';
import { CreateGradeDto } from './dto/create-grade.dto';

@Injectable()
export class GradesService {
  constructor(@Inject(DRIZZLE) private db: PostgresJsDatabase<typeof schema>) {}

  async createComponent(data: CreateGradeComponentDto) {
    if (data.weight < 0) {
      throw new BadRequestException('Bobot nilai tidak boleh negatif');
    }

    const duplicateName = await this.db
      .select()
      .from(schema.gradeComponents)
      .where(
        and(
          eq(schema.gradeComponents.classId, data.classId),
          ilike(schema.gradeComponents.componentName, data.componentName)
        )
      )
      .limit(1);

    if (duplicateName.length > 0) {
      throw new BadRequestException(`Komponen dengan nama "${data.componentName}" sudah terdaftar di kelas ini`);
    }

    const existingComponents = await this.db
      .select()
      .from(schema.gradeComponents)
      .where(eq(schema.gradeComponents.classId, data.classId));

    const currentTotalWeight = existingComponents.reduce((acc, comp) => acc + comp.weight, 0);

    if (currentTotalWeight + data.weight > 100) {
      throw new BadRequestException(
        `Total bobot melebihi 100%. Tersisa: ${100 - currentTotalWeight}%`
      );
    }

    return await this.db.insert(schema.gradeComponents).values({
      classId: data.classId,
      componentName: data.componentName,
      weight: data.weight,
    }).returning();
  }

  async editComponent(id: number, data: CreateGradeComponentDto) {
    if (data.weight < 0) {
      throw new BadRequestException('Bobot nilai tidak boleh negatif');
    }

    const componentToEdit = await this.db
      .select()
      .from(schema.gradeComponents)
      .where(eq(schema.gradeComponents.id, id))
      .limit(1);

    if (componentToEdit.length === 0) {
      throw new NotFoundException('Komponen nilai tidak ditemukan');
    }

    const duplicateName = await this.db
      .select()
      .from(schema.gradeComponents)
      .where(
        and(
          eq(schema.gradeComponents.classId, data.classId),
          ilike(schema.gradeComponents.componentName, data.componentName),
          ne(schema.gradeComponents.id, id)
        )
      )
      .limit(1);

    if (duplicateName.length > 0) {
      throw new BadRequestException(`Nama komponen "${data.componentName}" sudah digunakan oleh komponen lain di kelas ini`);
    }

    const otherComponents = await this.db
      .select()
      .from(schema.gradeComponents)
      .where(
        and(
          eq(schema.gradeComponents.classId, data.classId),
          ne(schema.gradeComponents.id, id)
        )
      );

    const otherTotalWeight = otherComponents.reduce((acc, comp) => acc + comp.weight, 0);

    if (otherTotalWeight + data.weight > 100) {
      throw new BadRequestException(
        `Gagal update. Total bobot akan menjadi ${otherTotalWeight + data.weight}%. Maksimal 100%.`
      );
    }

    return await this.db
      .update(schema.gradeComponents)
      .set({
        componentName: data.componentName,
        weight: data.weight
      })
      .where(eq(schema.gradeComponents.id, id))
      .returning();
  }

  async deleteComponent(id: number) {
    const data = await this.db
      .delete(schema.gradeComponents)
      .where(eq(schema.gradeComponents.id, id))
      .returning();

    if (data.length === 0) throw new BadRequestException('Gagal menghapus data nilai komponen');

    return data;
  }
  
  async getGradeComponents(classId: number) {
    const data = await this.db
      .select()
      .from(schema.gradeComponents)
      .where(eq(schema.gradeComponents.classId, classId))

    if (!data) throw new BadRequestException('Gagal mengambil data nilai komponen');

    return data;
  }

  async setPublishStatus(classId: number, isPublished: boolean) {
    const data = await this.db
      .update(schema.gradeComponents)
      .set({ isPublished: isPublished })
      .where(eq(schema.gradeComponents.classId, classId));

      if (!data) throw new BadRequestException('Gagal publish nilai');

      return data;
  }

  async calculateAndUpdateFinalGrades(classId: number) {
    const [enrolledStudents, publishedComponents] = await Promise.all([
      this.db
        .select({ irsId: schema.irs.id, studentNpm: schema.users.id })
        .from(schema.irs)
        .innerJoin(schema.users, eq(schema.irs.studentId, schema.users.id))
        .where(eq(schema.irs.classId, classId)),

      this.db
        .select()
        .from(schema.gradeComponents)
        .where(
          and(
            eq(schema.gradeComponents.classId, classId),
            eq(schema.gradeComponents.isPublished, true)
          )
        ),
    ]);

    if (enrolledStudents.length === 0 || publishedComponents.length === 0) return;

    const componentIds = publishedComponents.map((c) => c.id);
    const studentIds = enrolledStudents.map((s) => s.studentNpm);

    const allGrades = await this.db
      .select({ studentId: schema.grades.studentId, componentId: schema.grades.componentId, score: schema.grades.value })
      .from(schema.grades)
      .where(
        and(
          inArray(schema.grades.studentId, studentIds),
          inArray(schema.grades.componentId, componentIds)
        )
      );

    const gradeMap = new Map<string, number>();
    for (const g of allGrades) {
      gradeMap.set(`${g.studentId}-${g.componentId}`, Number(g.score));
    }

    const updates = enrolledStudents.map((student) => {
      const finalScore = publishedComponents.reduce((acc, comp) => {
        const score = gradeMap.get(`${student.studentNpm}-${comp.id}`) ?? 0;
        return acc + score * (comp.weight / 100);
      }, 0);

      return { irsId: student.irsId, nilaiAkhir: finalScore.toFixed(2) };
    });

    await Promise.all(
      updates.map((u) =>
        this.db
          .update(schema.irs)
          .set({ nilaiAkhir: u.nilaiAkhir })
          .where(eq(schema.irs.id, u.irsId))
      )
    );
  }

  async gradeStudent(studentId: number, gradesList: CreateGradeDto[]) {
    return await this.db.transaction(async (tx) => {
      const results: typeof schema.grades.$inferInsert[] = [];

      for (const item of gradesList) {
        if (item.value < 0 || item.value > 100) {
          throw new BadRequestException(`Nilai ${item.value} tidak valid (harus 0-100)`);
        }

        const [updatedGrade] = await tx
          .insert(schema.grades)
          .values({
            studentId: studentId,
            componentId: item.componentId,
            value: item.value.toString(),
          })
          .onConflictDoUpdate({
            target: [schema.grades.studentId, schema.grades.componentId],
            set: { value: item.value.toString() },
          })
          .returning();
        
        if (updatedGrade) {
          results.push(updatedGrade);
        }
      }

      if (results.length === 0) {
        throw new BadRequestException('Tidak ada data nilai yang berhasil diproses');
      }

      return results;
    });
  }

  async getStudentGradeByClass(targetStudentId: number, classId: number, currentUser: any) {
    if (currentUser.role === 'MAHASISWA' && currentUser.id !== targetStudentId) {
      throw new ForbiddenException('Akses ditolak: Anda tidak dapat melihat nilai mahasiswa lain');
    }

    const data = await this.db.query.grades.findMany({
      where: eq(schema.grades.studentId, targetStudentId),
      with: {
        component: true,
      },
    });

    const filteredData = data.filter((item) => {
      const isCorrectClass = item.component && item.component.classId === classId;

      if (!isCorrectClass) return false;

      if (currentUser.role === 'MAHASISWA') {
        return item.component?.isPublished === true;
      }

      return true; 
    });

    return filteredData;
  }
}

