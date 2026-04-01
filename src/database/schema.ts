import {
  pgTable,
  serial,
  varchar,
  pgEnum,
  integer,
  timestamp, time
} from 'drizzle-orm/pg-core';

// Deklarasi Enum
export const roleEnum = pgEnum('role', ['DOSEN', 'MAHASISWA']);

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  npm_atau_nip: varchar('npm_atau_nip', { length: 50 }).notNull().unique(),
  nama: varchar('nama', { length: 255 }).notNull(),
  password: varchar('password', { length: 255 }).notNull(),
  role: roleEnum('role').default('MAHASISWA').notNull(),
});

export const courses = pgTable('courses', {
  id: serial('id').primaryKey(),
  kode: varchar('kode', { length: 20 }).notNull().unique(),
  nama: varchar('nama', { length: 255 }).notNull(),
  sks: integer('sks').notNull(),
});

export const classes = pgTable('classes', {
  id: serial('id').primaryKey(),
  courseId: integer('course_id')
    .references(() => courses.id, {
      onDelete: 'cascade',
    })
    .notNull(),
  namaKelas: varchar('nama_kelas', { length: 20 }).notNull(),
  dosenId: varchar('dosen_id').references(() => users.npm_atau_nip),
  kapasitas: integer('kapasitas').notNull().default(40),
  jadwal: varchar('jadwal', { length: 100 }),
});

export const irs = pgTable('irs', {
  id: serial('id').primaryKey(),
  studentId: integer('student_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  classId: integer('class_id')
    .references(() => classes.id, { onDelete: 'cascade' })
    .notNull(),
  status: varchar('status', { length: 20 }).default('PENDING'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const classSchedules = pgTable('class_schedules', {
  id: serial('id').primaryKey(),
  classId: integer('class_id').references(() => classes.id, { onDelete: 'cascade' }),
  hari: integer('hari').notNull(),
  jamMulai: time('jam_mulai').notNull(),
  jamSelesai: time('jam_selesai').notNull(),
  ruangan: varchar('ruangan', { length: 20} )
})
