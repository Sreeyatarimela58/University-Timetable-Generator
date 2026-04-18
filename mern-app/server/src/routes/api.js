import express from 'express';
import { getAll, getById, create, update, remove, getStats } from '../controllers/entityController.js';
import { generateDrafts, getDraft, publishDraft, getActiveGeneration, getPendingDraftSummary, clearPendingDrafts } from '../controllers/generatorController.js';
import { login } from '../controllers/authController.js';
import { createUser, listUsers } from '../controllers/userController.js';
import { protect, requireAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public Auth Route
router.post('/login', login);

// Admin User Management Routes
router.post('/users', protect, requireAdmin, createUser);
router.get('/users', protect, requireAdmin, listUsers);

// Generation Lifecycle
router.get('/generation/active', protect, requireAdmin, getActiveGeneration);

// Draft Generation Endpoints
router.get('/drafts/pending/summary', protect, requireAdmin, getPendingDraftSummary);
router.delete('/drafts/pending/clear', protect, requireAdmin, clearPendingDrafts);
router.post('/generate-drafts', protect, requireAdmin, generateDrafts);
router.get('/drafts/:id', protect, requireAdmin, getDraft);
router.post('/publish/:draftId/:optionIndex', protect, requireAdmin, publishDraft);

// Stats Endpoint
router.get('/stats', protect, getStats);

// Generic Entity CRUD routes (Protected)
router.get('/:entity', protect, getAll);
router.get('/:entity/:id', protect, getById);
router.post('/:entity', protect, requireAdmin, create);
router.put('/:entity/:id', protect, requireAdmin, update);
router.delete('/:entity/:id', protect, requireAdmin, remove);

export default router;
