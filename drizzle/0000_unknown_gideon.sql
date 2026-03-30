CREATE TYPE "public"."role" AS ENUM('DOSEN', 'MAHASISWA');--> statement-breakpoint
CREATE TABLE "classes" (
	"id" serial PRIMARY KEY NOT NULL,
	"course_id" integer,
	"nama_kelas" varchar(20) NOT NULL,
	"dosen_id" integer,
	"kapasitas" integer DEFAULT 40 NOT NULL,
	"jadwal" varchar(100)
);
--> statement-breakpoint
CREATE TABLE "courses" (
	"id" serial PRIMARY KEY NOT NULL,
	"kode" varchar(20) NOT NULL,
	"nama" varchar(255) NOT NULL,
	"sks" serial NOT NULL,
	CONSTRAINT "courses_kode_unique" UNIQUE("kode")
);
--> statement-breakpoint
CREATE TABLE "irs" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" integer NOT NULL,
	"course_id" integer NOT NULL,
	"status" varchar(20) DEFAULT 'PENDING',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"npm_atau_nip" varchar(50) NOT NULL,
	"nama" varchar(255) NOT NULL,
	"password" varchar(255) NOT NULL,
	"role" "role" DEFAULT 'MAHASISWA' NOT NULL,
	CONSTRAINT "users_npm_atau_nip_unique" UNIQUE("npm_atau_nip")
);
--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_dosen_id_users_id_fk" FOREIGN KEY ("dosen_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "irs" ADD CONSTRAINT "irs_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "irs" ADD CONSTRAINT "irs_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;