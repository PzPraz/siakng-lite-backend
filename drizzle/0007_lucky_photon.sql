CREATE TABLE "grade_components" (
	"id" serial PRIMARY KEY NOT NULL,
	"class_id" integer,
	"component_name" varchar(50) NOT NULL,
	"weight" integer NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grades" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" integer,
	"component_id" integer,
	"value" numeric(3, 2) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "grade_components" ADD CONSTRAINT "grade_components_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grades" ADD CONSTRAINT "grades_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grades" ADD CONSTRAINT "grades_component_id_grade_components_id_fk" FOREIGN KEY ("component_id") REFERENCES "public"."grade_components"("id") ON DELETE cascade ON UPDATE no action;