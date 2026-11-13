let extractor = null;
let isInitializing = false;
let initPromise = null;

/**
 * Initializes the local Xenova all-MiniLM-L6-v2 model
 */
export const getEmbeddingExtractor = async () => {
  if (extractor) return extractor;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const { pipeline } = await import('@xenova/transformers');
      extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
        quantized: true
      });
      console.log('[EmbeddingService] Local Xenova all-MiniLM-L6-v2 pipeline ready');
      return extractor;
    } catch (err) {
      console.warn('[EmbeddingService] Warning: Could not initialize local HuggingFace model, using fallback vectorizer:', err.message);
      return null;
    }
  })();

  return initPromise;
};

/**
 * Generates vector embedding for a single text chunk
 * @param {string} text
 * @returns {Promise<number[]>}
 */
export const generateEmbedding = async (text) => {
  if (!text || text.trim().length === 0) {
    return new Array(384).fill(0);
  }

  try {
    const pipe = await getEmbeddingExtractor();
    if (pipe) {
      const output = await pipe(text, { pooling: 'mean', normalize: true });
      return Array.from(output.data);
    }
  } catch (error) {
    console.error('[EmbeddingService] Pipeline generation failed, using fallback:', error.message);
  }

  // Fallback vectorizer (384-dimensional bag-of-words / character n-gram hash) to guarantee 100% resilience
  return generateDeterministicFallbackEmbedding(text, 384);
};

/**
 * Generates embeddings in batch
 * @param {string[]} texts
 * @returns {Promise<number[][]>}
 */
export const generateBatchEmbeddings = async (texts) => {
  const results = [];
  for (const text of texts) {
    const emb = await generateEmbedding(text);
    results.push(emb);
  }
  return results;
};

/**
 * Deterministic hash-based embedding fallback
 */
function generateDeterministicFallbackEmbedding(text, dimensions = 384) {
  const vector = new Array(dimensions).fill(0);
  const words = text.toLowerCase().match(/\b\w+\b/g) || [];
  
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    let hash = 0;
    for (let j = 0; j < word.length; j++) {
      hash = (hash << 5) - hash + word.charCodeAt(j);
      hash |= 0;
    }
    const index = Math.abs(hash) % dimensions;
    vector[index] += 1;
  }

  // Normalize
  const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  if (norm > 0) {
    for (let i = 0; i < dimensions; i++) {
      vector[i] /= norm;
    }
  }
  return vector;
}

/**
 * Compute cosine similarity between two numeric vectors
 */
export const cosineSimilarity = (vecA, vecB) => {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;
  return dotProduct / denominator;
};
