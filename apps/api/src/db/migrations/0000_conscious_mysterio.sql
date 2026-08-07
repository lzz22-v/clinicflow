CREATE TABLE IF NOT EXISTS "tickets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(10) NOT NULL,
	"patient_name" varchar(100) NOT NULL,
	"priority" varchar(20) NOT NULL,
	"status" varchar(20) DEFAULT 'waiting' NOT NULL,
	"room" varchar(50),
	"floor" varchar(50),
	"doctor_name" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
