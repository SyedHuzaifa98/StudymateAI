import fs from 'fs';
import Course from '../models/Course.js';
import Document from '../models/Document.js';
import DocumentChunk from '../models/DocumentChunk.js';
import { extractPdfContent, chunkExtractedPages } from '../services/pdfService.js';
import { generateEmbedding } from '../services/embeddingService.js';

export const getDocuments = async (req, res) => {
  try {
    const { courseId } = req.params;

    // Verify course belongs to user
    const course = await Course.findOne({ _id: courseId, userId: req.user._id });
    if (!course) {
      return res.status(404).json({ message: 'Course not found or unauthorized.' });
    }

    const documents = await Document.find({ courseId }).sort({ createdAt: -1 });
    return res.json({ success: true, documents });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const uploadDocument = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded or file is not a valid PDF.' });
  }

  const { courseId } = req.params;

  try {
    // Verify course ownership
    const course = await Course.findOne({ _id: courseId, userId: req.user._id });
    if (!course) {
      // Clean up uploaded file
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(404).json({ message: 'Course not found or unauthorized.' });
    }

    // Check for duplicate file upload
    const existingDoc = await Document.findOne({
      courseId,
      originalName: req.file.originalname,
      status: 'completed'
    });

    if (existingDoc) {
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(400).json({
        message: 'A document with this exact filename has already been processed for this course. To re-upload, please delete the existing one first.'
      });
    }

    // Create Document record in pending state
    const document = await Document.create({
      courseId,
      userId: req.user._id,
      originalName: req.file.originalname,
      filePath: req.file.path,
      fileSize: req.file.size,
      status: 'processing'
    });

    // Start background processing
    processDocumentInBackground(document._id, courseId, req.file.path);

    return res.status(202).json({
      success: true,
      message: 'PDF uploaded successfully and is being processed.',
      document
    });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Async processing: text extraction, scanned validation, chunking, embedding generation & storage
 */
async function processDocumentInBackground(docId, courseId, filePath) {
  try {
    console.log(`[PDF Processing] Starting extraction for document ${docId}`);
    const { pages, totalPages } = await extractPdfContent(filePath);

    console.log(`[PDF Processing] Document ${docId} has ${totalPages} pages. Chunking...`);
    const chunks = chunkExtractedPages(pages, 700, 100);

    if (chunks.length === 0) {
      throw new Error('No readable text content found in document. Please upload a PDF with text notes.');
    }

    console.log(`[PDF Processing] Generating embeddings for ${chunks.length} chunks...`);
    const chunkDocs = [];

    for (let i = 0; i < chunks.length; i++) {
      const c = chunks[i];
      const embedding = await generateEmbedding(c.content);
      chunkDocs.push({
        documentId: docId,
        courseId,
        pageNumber: c.pageNumber,
        chunkIndex: c.chunkIndex,
        content: c.content,
        embedding
      });
    }

    // Bulk insert chunks into MongoDB
    await DocumentChunk.insertMany(chunkDocs);

    // Update document status
    await Document.findByIdAndUpdate(docId, {
      status: 'completed',
      pageCount: totalPages,
      totalChunks: chunks.length,
      errorMessage: ''
    });

    console.log(`[PDF Processing] Completed processing for document ${docId} (${chunks.length} chunks created)`);
  } catch (error) {
    console.error(`[PDF Processing Error for ${docId}]:`, error.message);
    await Document.findByIdAndUpdate(docId, {
      status: 'failed',
      errorMessage: error.message || 'Processing failed'
    });
  }
}

export const deleteDocument = async (req, res) => {
  try {
    const { courseId, docId } = req.params;

    const document = await Document.findOne({ _id: docId, courseId, userId: req.user._id });
    if (!document) {
      return res.status(404).json({ message: 'Document not found or unauthorized.' });
    }

    // Delete chunks
    await DocumentChunk.deleteMany({ documentId: docId });

    // Remove local file
    if (fs.existsSync(document.filePath)) {
      try {
        fs.unlinkSync(document.filePath);
      } catch (e) {
        console.warn('Failed to delete physical file:', e.message);
      }
    }

    // Delete document record
    await Document.findByIdAndDelete(docId);

    return res.json({ success: true, message: 'Document and its indexed chunks deleted successfully.' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
