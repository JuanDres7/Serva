CREATE TYPE "public"."category_key" AS ENUM('groceries', 'eating_out', 'transport', 'housing', 'utilities', 'health', 'education', 'entertainment', 'subscriptions', 'shopping', 'pets', 'debt', 'other_expense', 'salary', 'business', 'gifts', 'refunds', 'other_income');--> statement-breakpoint
CREATE TYPE "public"."category_source" AS ENUM('user', 'keywords', 'similarity', 'model');--> statement-breakpoint
CREATE TYPE "public"."movement_status" AS ENUM('active', 'voided');--> statement-breakpoint
CREATE TYPE "public"."movement_type" AS ENUM('expense', 'income', 'saving');--> statement-breakpoint
CREATE TYPE "public"."saving_direction" AS ENUM('contribution', 'withdrawal');--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"type" "movement_type" NOT NULL,
	"amount_cents" bigint NOT NULL,
	"currency" char(3) NOT NULL,
	"category" "category_key",
	"category_source" "category_source" DEFAULT 'user' NOT NULL,
	"occurred_on" date NOT NULL,
	"description" text,
	"description_short" text,
	"status" "movement_status" DEFAULT 'active' NOT NULL,
	"voided_at" timestamp with time zone,
	"is_sample" text,
	"saving_goal_id" uuid,
	"saving_direction" "saving_direction",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "amount_positive" CHECK ("transactions"."amount_cents" > 0),
	CONSTRAINT "date_not_future" CHECK ("transactions"."occurred_on" <= CURRENT_DATE),
	CONSTRAINT "category_matches_type" CHECK (("transactions"."type" = 'saving' AND "transactions"."category" IS NULL)
          OR ("transactions"."type" <> 'saving' AND "transactions"."category" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "user_settings" (
	"user_id" text PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL,
	"country" char(2) NOT NULL,
	"currency" char(3) NOT NULL,
	"locale" text NOT NULL,
	"time_zone" text NOT NULL,
	"cycle_config" jsonb DEFAULT '{"kind":"calendar-month"}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "transactions_user_date_idx" ON "transactions" USING btree ("user_id","occurred_on" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "transactions_user_category_idx" ON "transactions" USING btree ("user_id","category","occurred_on");--> statement-breakpoint
CREATE INDEX "transactions_user_status_idx" ON "transactions" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");