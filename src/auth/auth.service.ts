import { Injectable, Inject, ConflictException } from '@nestjs/common';
import { DRIZZLE } from '../database/database.module';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../database/schema';
import * as bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import { RegisterUser } from './dto/RegisterUser.dto';

@Injectable()
export class AuthService {
  constructor(@Inject(DRIZZLE) private db: PostgresJsDatabase<typeof schema>) {}

  async register(userData: RegisterUser) {
    // 1. Cek apakah user sudah ada
    const existingUser = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.npm_atau_nip, userData.npm_atau_nip))
      .limit(1);

    if (existingUser.length > 0) {
      throw new ConflictException('NPM atau NIP sudah terdaftar');
    }

    const saltOrRounds = 10;
    const hashedPassword = await bcrypt.hash(userData.password, saltOrRounds);

    return await this.db
      .insert(schema.users)
      .values({
        ...userData,
        password: hashedPassword,
      })
      .returning();
  }
}
