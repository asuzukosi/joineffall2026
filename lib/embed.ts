import OpenAI from "openai";

const MODEL = process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small";

export const EMBED_BATCH = 256;

export async function embed(texts: string[]): Promise<Float32Array[]> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not set");

  const response = await new OpenAI({ apiKey: key }).embeddings.create({
    model: MODEL,
    input: texts,
  });

  // Stored normalised, so a search is a dot product with no per-row division.
  return response.data.map((item) => {
    const vector = Float32Array.from(item.embedding);
    let sum = 0;
    for (const value of vector) sum += value * value;
    const norm = Math.sqrt(sum) || 1;
    for (let i = 0; i < vector.length; i++) vector[i] /= norm;
    return vector;
  });
}
