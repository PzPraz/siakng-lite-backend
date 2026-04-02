import { Injectable, BadRequestException, Inject, NotFoundException } from '@nestjs/common';
import { DRIZZLE } from 'src/database/database.module';
import * as schema from '../database/schema';
import { eq, and, ne, ilike } from 'drizzle-orm'; // Tambahkan ilike
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { CreateGradeComponentDto } from './dto/create-grade-component.dto';

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
  
  async getGradeComponents(classId: number) {
    const data = await this.db
      .select()
      .from(schema.gradeComponents)
      .where(eq(schema.classes.id, classId))

    if (!data) throw new BadRequestException('Gagal mengambil data nilai komponen')
  }
}