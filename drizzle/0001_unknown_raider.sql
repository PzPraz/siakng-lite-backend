ALTER TABLE "irs" RENAME COLUMN "course_id" TO "class_id";--> statement-breakpoint
ALTER TABLE "irs" DROP CONSTRAINT "irs_course_id_courses_id_fk";
--> statement-breakpoint
ALTER TABLE "irs" ADD CONSTRAINT "irs_class_id_courses_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;