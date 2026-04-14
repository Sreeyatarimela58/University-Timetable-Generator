import express from 'express';
import { getAll, getById, create, update, remove } from '../controllers/entityController.js';
import { generateTimetable } from '../controllers/generatorController.js';
import { login } from '../controllers/authController.js';
import { createUser, listUsers } from '../controllers/userController.js';
import { protect, requireAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public Auth Route
router.post('/login', login);

// Admin User Management Routes
router.post('/users', protect, requireAdmin, createUser);
router.get('/users', protect, requireAdmin, listUsers);

// Generic Entity CRUD routes (Protected)
router.get('/:entity', protect, getAll);
router.get('/:entity/:id', protect, getById);
router.post('/:entity', protect, requireAdmin, create);
router.put('/:entity/:id', protect, requireAdmin, update);
router.delete('/:entity/:id', protect, requireAdmin, remove);

// Generator Endpoint
router.post('/generate', protect, requireAdmin, generateTimetable);

export default router;
