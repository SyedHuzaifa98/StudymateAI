import DocumentChunk from '../models/DocumentChunk.js';
import Document from '../models/Document.js';
import { generateEmbedding, cosineSimilarity } from './embeddingService.js';

/**
 * Retrieves the most relevant chunks for a user query from a specific course
 * @param {string} courseId
 * @param {string} query
 * @param {number} topK
 * @returns {Promise<Array<{ content: string, pageNumber: number, documentName: string, similarity: number }>>}
 */
export const retrieveRelevantChunks = async (courseId, query, topK = 5) => {
  // Generate embedding for query
  const queryEmbedding = await generateEmbedding(query);

  // Retrieve all chunks for this course
  const chunks = await DocumentChunk.find({ courseId }).lean();
  if (!chunks || chunks.length === 0) {
    return [];
  }

  // Get document names map
  const docIds = [...new Set(chunks.map((c) => c.documentId.toString()))];
  const docs = await Document.find({ _id: { $in: docIds } }).lean();
  const docMap = {};
  for (const doc of docs) {
    docMap[doc._id.toString()] = doc.originalName;
  }

  // Compute similarities
  const scoredChunks = chunks.map((chunk) => {
    const similarity = cosineSimilarity(queryEmbedding, chunk.embedding);
    return {
      id: chunk._id,
      documentId: chunk.documentId,
      documentName: docMap[chunk.documentId.toString()] || 'Course Document',
      pageNumber: chunk.pageNumber,
      content: chunk.content,
      similarity
    };
  });

  // Sort descending by similarity
  scoredChunks.sort((a, b) => b.similarity - a.similarity);

  // Return top K chunks above minimum threshold
  return scoredChunks.slice(0, topK);
};
