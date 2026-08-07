CREATE TABLE IF NOT EXISTS "medical_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_ticket_id" uuid,
	"patient_cpf" varchar(14) NOT NULL,
	"patient_name" varchar(100) NOT NULL,
	"specialty" varchar(100),
	"doctor_name" varchar(100),
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
