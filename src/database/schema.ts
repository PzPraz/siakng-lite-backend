import {
  pgTable,
  serial,
  varchar,
  pgEnum,
  integer,
  numeric,
  timestamp, time, boolean
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

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

export const gradeComponents = pgTable('grade_components', {
  id: serial('id').primaryKey(),
  classId: integer('class_id').references(() => classes.id, { onDelete: 'cascade' }),
  componentName: varchar('component_name', { length: 50 }).notNull(),
  weight: integer('weight').notNull(),
  isPublished: boolean('is_published').notNull().default(false)
})

export const grades = pgTable('grades', {
  id: serial('id').primaryKey(),
  studentId: integer('student_id').references(() => users.id, { onDelete: 'cascade' }),
  componentId: integer('component_id').references(() => gradeComponents.id, { onDelete: 'cascade' }),
  value: numeric('value', { precision: 3, scale: 2 }).notNull(),
})

// 1. Relasi untuk Tabel Users
export const usersRelations = relations(users, ({ many }) => ({
  classes: many(classes),
}));

// 2. Relasi untuk Tabel Courses
export const coursesRelations = relations(courses, ({ many }) => ({
  classes: many(classes),
}));

// 3. Relasi untuk Tabel Classes
export const classesRelations = relations(classes, ({ one, many }) => ({
  course: one(courses, {
    fields: [classes.courseId],
    references: [courses.id],
  }),
  dosen: one(users, {
    fields: [classes.dosenId],
    references: [users.npm_atau_nip],
  }),
  schedules: many(classSchedules),
}));

// 4. Relasi untuk Tabel ClassSchedules
export const classSchedulesRelations = relations(classSchedules, ({ one }) => ({
  class: one(classes, {
    fields: [classSchedules.classId],
    references: [classes.id],
  }),
}));