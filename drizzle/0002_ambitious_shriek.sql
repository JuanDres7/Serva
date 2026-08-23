CREATE TYPE "public"."categorization_mechanism" AS ENUM('keywords', 'similarity', 'model', 'none');--> statement-breakpoint
CREATE TABLE "categorization_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"transaction_id" uuid,
	"input_text" text NOT NULL,
	"normalized_text" text NOT NULL,
	"keywords" text[] DEFAULT '{}' NOT NULL,
	"suggested_category" "category_key",
	"confidence" real,
	"mechanism" "categorization_mechanism" NOT NULL,
	"final_category" "category_key",
	"was_corrected" boolean DEFAULT false NOT NULL,
	"latency_ms" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "categorization_log" ADD CONSTRAINT "categorization_log_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categorization_log" ADD CONSTRAINT "categorization_log_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "categorization_user_keywords_idx" ON "categorization_log" USING gin ("keywords");--> statement-breakpoint
CREATE INDEX "categorization_user_idx" ON "categorization_log" USING btree ("user_id","final_category");--> statement-breakpoint
CREATE INDEX "categorization_user_date_idx" ON "categorization_log" USING btree ("user_id","created_at");