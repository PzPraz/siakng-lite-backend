ALTER TABLE "irs" ADD COLUMN "nilai_akhir" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "grades" ADD CONSTRAINT "grades_student_id_component_id_unique" UNIQUE("student_id","component_id");