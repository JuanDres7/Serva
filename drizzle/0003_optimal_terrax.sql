-- Convertir `is_sample` de texto a booleano.
--
-- drizzle-kit genera un ALTER sin cláusula USING, que Postgres rechaza: no sabe
-- cómo interpretar un texto como booleano. Se indica explícitamente que
-- cualquier valor no nulo y distinto de 'false' cuenta como verdadero.
ALTER TABLE "transactions"
  ALTER COLUMN "is_sample" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "transactions"
  ALTER COLUMN "is_sample" SET DATA TYPE boolean
  USING ("is_sample" IS NOT NULL AND lower("is_sample") NOT IN ('false', 'f', '0', ''));--> statement-breakpoint
UPDATE "transactions" SET "is_sample" = false WHERE "is_sample" IS NULL;--> statement-breakpoint
ALTER TABLE "transactions"
  ALTER COLUMN "is_sample" SET DEFAULT false;--> statement-breakpoint
ALTER TABLE "transactions"
  ALTER COLUMN "is_sample" SET NOT NULL;
