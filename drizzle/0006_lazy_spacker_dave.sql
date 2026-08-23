CREATE TABLE "recurring_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"type" "movement_type" NOT NULL,
	"amount_cents" bigint NOT NULL,
	"currency" char(3) NOT NULL,
	"category" "category_key" NOT NULL,
	"description" text NOT NULL,
	"schedule" jsonb NOT NULL,
	"next_due_on" date NOT NULL,
	"last_confirmed_on" date,
	"is_sample" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recurring_amount_positive" CHECK ("recurring_movements"."amount_cents" > 0),
	CONSTRAINT "recurring_not_saving" CHECK ("recurring_movements"."type" <> 'saving')
);
--> statement-breakpoint
ALTER TABLE "recurring_movements" ADD CONSTRAINT "recurring_movements_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "recurring_user_due_idx" ON "recurring_movements" USING btree ("user_id","next_due_on");