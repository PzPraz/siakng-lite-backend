ALTER TABLE "classes" DROP CONSTRAINT "classes_dosen_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "classes" ALTER COLUMN "dosen_id" SET DATA TYPE varchar;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_dosen_id_users_npm_atau_nip_fk" FOREIGN KEY ("dosen_id") REFERENCES "public"."users"("npm_atau_nip") ON DELETE no action ON UPDATE no action;