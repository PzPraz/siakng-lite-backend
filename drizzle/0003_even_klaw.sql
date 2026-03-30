ALTER TABLE "irs" DROP CONSTRAINT "irs_class_id_courses_id_fk";
--> statement-breakpoint
ALTER TABLE "irs" ADD CONSTRAINT "irs_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;