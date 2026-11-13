import express from 'express';
import { getDocuments, uploadDocument, deleteDocument } from '../controllers/documentController.js';
import { protect } from '../middleware/auth.js';
import { uploadPDF } from '../middleware/upload.js';

const router = express.Router({ mergeParams: true });

router.use(protect);

router.route('/')
  .get(getDocuments)
  .post(uploadPDF.single('file'), uploadDocument);

router.route('/:docId')
  .delete(deleteDocument);

export default router;
