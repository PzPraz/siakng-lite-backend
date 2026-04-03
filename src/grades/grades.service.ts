import { Injectable, BadRequestException, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { DRIZZLE } from 'src/database/database.module';
import * as schema from '../database/schema';
import { eq, and, ne, ilike } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { CreateGradeComponentDto } from './dto/create-grade-component.dto';
import { CreateGradeDto } from './dto/create-grade.dto';
import type { AuthenticatedUser } from 'src/auth/types/authenticated-user.type';

@Injectable()
export class GradesService {
  constructor(@Inject(DRIZZLE) private db: PostgresJsDatabase<typeof schema>) {}

  private static normalizeComponentName(name: string) {
    return name.trim().toLowerCase();
  }

  private validateWeight(weight: number) {
    if (weight < 0) {
      throw new BadRequestException('Bobot nilai tidak boleh negatif');
    }
  }

  private validateComponentPayload(data: CreateGradeComponentDto) {
    if (!data.components || data.components.length === 0) {
      throw new BadRequestException('Minimal satu komponen nilai harus dikirim');
    }

    const seen = new Set<string>();
    for (const component of data.components) {
      this.validateWeight(component.weight);

      const normalizedName = GradesService.normalizeComponentName(component.componentName);
      if (seen.has(normalizedName)) {
        throw new BadRequestException(`Duplikasi komponen pada payload: "${component.componentName}"`);
      }
      seen.add(normalizedName);
    }
  }

  private async ensureUniqueComponentName(classId: number, componentName: string, excludeId?: number) {
    const conditions = [
      eq(schema.gradeComponents.classId, classId),
      ilike(schema.gradeComponents.componentName, componentName),
    ];

    if (excludeId !== undefined) {
      conditions.push(ne(schema.gradeComponents.id, excludeId));
    }

    const duplicateName = await this.db
      .select()
      .from(schema.gradeComponents)
      .where(and(...conditions))
      .limit(1);

    if (duplicateName.length > 0) {
      throw new BadRequestException(
        excludeId === undefined
          ? `Komponen dengan nama "${componentName}" sudah terdaftar di kelas ini`
          : `Nama komponen "${componentName}" sudah digunakan oleh komponen lain di kelas ini`,
      );
    }
  }

  private async getTotalWeightByClass(classId: number, excludeId?: number) {
    const conditions = [eq(schema.gradeComponents.classId, classId)];
    if (excludeId !== undefined) {
      conditions.push(ne(schema.gradeComponents.id, excludeId));
    }

    const components = await this.db
      .select()
      .from(schema.gradeComponents)
      .where(and(...conditions));

    return components.reduce((acc, comp) => acc + comp.weight, 0);
  }

  async createComponent(data: CreateGradeComponentDto) {
    this.validateComponentPayload(data);

    for (const component of data.components) {
      await this.ensureUniqueComponentName(data.classId, component.componentName);
    }

    const currentTotalWeight = await this.getTotalWeightByClass(data.classId);
    const payloadTotalWeight = data.components.reduce((acc, component) => acc + component.weight, 0);

    if (currentTotalWeight + payloadTotalWeight > 100) {
      throw new BadRequestException(
        `Total bobot melebihi 100%. Tersisa: ${100 - currentTotalWeight}%`
      );
    }

    return await this.db.insert(schema.gradeComponents).values(
      data.components.map((component) => ({
        classId: data.classId,
        componentName: component.componentName,
        weight: component.weight,
      })),
    ).returning();
  }

  async editComponent(id: number, data: CreateGradeComponentDto) {
    this.validateComponentPayload(data);

    if (data.components.length !== 1) {
      throw new BadRequestException('Endpoint edit komponen hanya menerima satu komponen');
    }

    const payload = data.components[0];

    const componentToEdit = await this.db
      .select()
      .from(schema.gradeComponents)
      .where(eq(schema.gradeComponents.id, id))
      .limit(1);

    if (componentToEdit.length === 0) {
      throw new NotFoundException('Komponen nilai tidak ditemukan');
    }

    const targetClassId = componentToEdit[0].classId ?? data.classId;

    await this.ensureUniqueComponentName(targetClassId, payload.componentName, id);

    const otherTotalWeight = await this.getTotalWeightByClass(targetClassId, id);

    if (otherTotalWeight + payload.weight > 100) {
      throw new BadRequestException(
        `Gagal update. Total bobot akan menjadi ${otherTotalWeight + payload.weight}%. Maksimal 100%.`
      );
    }

    return await this.db
      .update(schema.gradeComponents)
      .set({
        componentName: payload.componentName,
        weight: payload.weight
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

  async getStudentGradeByClass(targetStudentId: number, classId: number, currentUser: AuthenticatedUser) {
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

