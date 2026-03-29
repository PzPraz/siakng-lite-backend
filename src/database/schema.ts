import { pgTable, serial, varchar, pgEnum } from 'drizzle-orm/pg-core';

// Deklarasi Enum
export const roleEnum = pgEnum('role', ['DOSEN', 'MAHASISWA']);

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  npm_atau_nip: varchar('npm_atau_nip', { length: 50 }).notNull().unique(),
  nama: varchar('nama', { length: 255 }).notNull(),
  password: varchar('password', { length: 255 }).notNull(),
  role: roleEnum('role').default('MAHASISWA').notNull(),
});
