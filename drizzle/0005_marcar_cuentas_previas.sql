-- Marca como configuradas las cuentas que ya estaban en uso.
--
-- La pantalla de configuración inicial llegó después de que hubiera cuentas con
-- movimientos. Sin esto, esas cuentas quedan con `onboarded_at` nulo y el
-- contenedor de la aplicación las manda a configurarse cada vez que entran,
-- aunque lleven semanas usando Finzen.
UPDATE "user_settings" AS s
SET "onboarded_at" = now()
WHERE s."onboarded_at" IS NULL
  AND EXISTS (
    SELECT 1 FROM "transactions" t WHERE t."user_id" = s."user_id"
  );
