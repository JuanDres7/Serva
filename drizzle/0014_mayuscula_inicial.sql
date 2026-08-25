-- Pone en mayúscula la primera letra de lo que ya estaba escrito (D-076).
--
-- Los esquemas de escritura —`transactionInputSchema`, `recurrenteSchema` y
-- `deudaSchema`— capitalizan desde ahora, pero solo lo que pasa por ellos. Todo
-- lo anterior sigue como lo devolvió el modelo: «palomitas cine», «primo», «mi
-- hermana». Sin esto el historial queda partido en dos épocas, y la que peor se
-- ve es la que ya está.
--
-- Solo la primera letra, igual que `enMayuscula`. `upper()` no hace nada sobre
-- cifras ni signos, así que «3 cervezas» se queda como está, y la condición
-- deja fuera lo que ya venía bien: la migración no toca ninguna fila que no
-- necesite tocar.
--
-- No hay vuelta atrás escrita. Bajar la primera letra otra vez estropearía lo
-- que siempre estuvo en mayúscula —«Netflix», «IVA»— y no hay forma de
-- distinguirlo después. Como lo que cambia es la caja de un carácter y ninguna
-- clave ni ninguna búsqueda depende de ella, se asume.

UPDATE "transactions"
SET "description" = upper(left("description", 1)) || right("description", -1)
WHERE "description" IS NOT NULL
  AND "description" <> ''
  AND left("description", 1) <> upper(left("description", 1));
--> statement-breakpoint

UPDATE "transactions"
SET "description_short" = upper(left("description_short", 1)) || right("description_short", -1)
WHERE "description_short" IS NOT NULL
  AND "description_short" <> ''
  AND left("description_short", 1) <> upper(left("description_short", 1));
--> statement-breakpoint

UPDATE "recurring_movements"
SET "description" = upper(left("description", 1)) || right("description", -1)
WHERE "description" <> ''
  AND left("description", 1) <> upper(left("description", 1));
--> statement-breakpoint

-- La contraparte es lo que más se nota, porque casi siempre es una persona:
-- «primo», «mi hermana». Buscar deudas por contraparte compara en minúsculas
-- por ambos lados, así que esto no rompe «le aboné 50 mil a mi primo».
UPDATE "debts"
SET "counterparty" = upper(left("counterparty", 1)) || right("counterparty", -1)
WHERE "counterparty" <> ''
  AND left("counterparty", 1) <> upper(left("counterparty", 1));
