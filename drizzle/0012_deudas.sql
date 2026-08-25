CREATE TYPE "public"."debt_direction" AS ENUM('owed_by_me', 'owed_to_me');--> statement-breakpoint
CREATE TYPE "public"."debt_flow" AS ENUM('received', 'lent', 'collected');--> statement-breakpoint
ALTER TYPE "public"."movement_type" ADD VALUE 'debt';--> statement-breakpoint
CREATE TABLE "debt_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"debt_id" uuid NOT NULL,
	"transaction_id" uuid,
	"amount_cents" bigint NOT NULL,
	"paid_on" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "debt_payments_amount_positive" CHECK ("debt_payments"."amount_cents" > 0)
);
--> statement-breakpoint
CREATE TABLE "debts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"direction" "debt_direction" NOT NULL,
	"counterparty" text NOT NULL,
	"original_cents" bigint NOT NULL,
	"currency" char(3) NOT NULL,
	"description" text,
	"due_on" date,
	"settled_at" timestamp with time zone,
	"is_sample" boolean DEFAULT false NOT NULL,
	"created_by" "movement_origin" DEFAULT 'user' NOT NULL,
	"assistant_write_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "debts_original_positive" CHECK ("debts"."original_cents" > 0),
	CONSTRAINT "debts_counterparty_not_empty" CHECK (length(trim("debts"."counterparty")) > 0)
);
--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "debt_flow" "debt_flow";--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "debt_id" uuid;--> statement-breakpoint
ALTER TABLE "debt_payments" ADD CONSTRAINT "debt_payments_debt_id_debts_id_fk" FOREIGN KEY ("debt_id") REFERENCES "public"."debts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "debt_payments" ADD CONSTRAINT "debt_payments_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "debts" ADD CONSTRAINT "debts_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "debt_payments_debt_idx" ON "debt_payments" USING btree ("debt_id","paid_on");--> statement-breakpoint
CREATE INDEX "debts_user_settled_idx" ON "debts" USING btree ("user_id","settled_at");