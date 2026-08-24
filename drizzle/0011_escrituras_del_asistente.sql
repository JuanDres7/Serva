CREATE TYPE "public"."assistant_write_kind" AS ENUM('crear', 'corregir', 'anular');--> statement-breakpoint
CREATE TYPE "public"."assistant_write_status" AS ENUM('propuesta', 'aplicada', 'revertida', 'rechazada', 'caducada');--> statement-breakpoint
CREATE TYPE "public"."movement_origin" AS ENUM('user', 'assistant');--> statement-breakpoint
CREATE TABLE "assistant_writes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"kind" "assistant_write_kind" NOT NULL,
	"status" "assistant_write_status" DEFAULT 'propuesta' NOT NULL,
	"input_text" text NOT NULL,
	"proposal" jsonb NOT NULL,
	"confidence" real,
	"model" text,
	"latency_ms" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "recurring_movements" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "created_by" "movement_origin" DEFAULT 'user' NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "assistant_write_id" uuid;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "auto_register_enabled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "assistant_writes" ADD CONSTRAINT "assistant_writes_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "assistant_writes_user_status_idx" ON "assistant_writes" USING btree ("user_id","status");--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_assistant_write_id_assistant_writes_id_fk" FOREIGN KEY ("assistant_write_id") REFERENCES "public"."assistant_writes"("id") ON DELETE set null ON UPDATE no action;