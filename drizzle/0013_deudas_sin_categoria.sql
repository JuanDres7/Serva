ALTER TABLE "transactions" DROP CONSTRAINT "category_matches_type";--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "category_matches_type" CHECK (("transactions"."type" IN ('saving', 'debt') AND "transactions"."category" IS NULL)
          OR ("transactions"."type" NOT IN ('saving', 'debt') AND "transactions"."category" IS NOT NULL));