import {
  Injectable,
  Inject,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { DRIZZLE } from '../database/database.module';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../database/schema';
import * as bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import { RegisterUser } from './dto/RegisterUser.dto';
import { LoginDto } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    @Inject(DRIZZLE) private db: PostgresJsDatabase<typeof schema>,
    private jwtService: JwtService,
  ) {}

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

  async login(loginDto: LoginDto) {
    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.npm_atau_nip, loginDto.npm_atau_nip))
      .limit(1);

    if (!user) {
      throw new UnauthorizedException('NPM/NIP tidak ditemukan');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Password salah');
    }

    const payload = {
      sub: user.id,
      npm: user.npm_atau_nip,
      role: user.role,
      nama: user.nama,
    };

    return {
      access_token: await this.jwtService.signAsync(payload),
      user: {
        id: user.id,
        nama: user.nama,
        role: user.role,
        npm_atau_nip: user.npm_atau_nip,
      },
    };
  }
}
