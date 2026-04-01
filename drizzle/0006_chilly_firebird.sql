CREATE TABLE "class_schedules" (
	"id" serial PRIMARY KEY NOT NULL,
	"class_id" integer,
	"hari" integer NOT NULL,
	"jam_mulai" time NOT NULL,
	"jam_selesai" time NOT NULL,
	"ruangan" varchar(20)
);
--> statement-breakpoint
ALTER TABLE "class_schedules" ADD CONSTRAINT "class_schedules_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;