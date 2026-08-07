ALTER TABLE "tickets" ADD COLUMN "patient_cpf" varchar(14);--> statement-breakpoint
ALTER TABLE "tickets" ADD COLUMN "specialty" varchar(100);--> statement-breakpoint
ALTER TABLE "tickets" ADD COLUMN "medical_record" text;