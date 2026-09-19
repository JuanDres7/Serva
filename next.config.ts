import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * El encoder de embeddings (spec 013, lib/ai/encoder.ts) usa
   * `@huggingface/transformers`, que carga `onnxruntime-node` — un módulo con
   * binarios nativos — de forma dinámica. Sin esto, el trazador de archivos
   * de Vercel no lo detecta como dependencia y el arranque falla con
   * "Cannot find module 'onnxruntime-node'" (verificado en el primer
   * despliegue real, D-080/D-082). El sistema se degrada solo (Art. III.2),
   * pero sin esto la búsqueda semántica nunca funciona en producción.
   */
  serverExternalPackages: ["@huggingface/transformers", "onnxruntime-node"],
};

export default nextConfig;
