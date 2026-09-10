-- Spec 013: Agregar columna embedding para búsqueda semántica
-- La columna es anulable: las filas existentes no tienen embedding.
-- El índice HNSW permite búsquedas eficientes con distancia coseno.

ALTER TABLE categorization_log
  ADD COLUMN embedding vector(384);

CREATE INDEX categorization_log_embedding_idx
  ON categorization_log
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
