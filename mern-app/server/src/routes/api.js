import express from 'express';
import { getAll, getById, create, update, remove } from '../controllers/entityController.js';
import { generateTimetable } from '../controllers/generatorController.js';

const router = express.Router();

// Generic Entity CRUD routes
router.get('/:entity', getAll);
router.get('/:entity/:id', getById);
router.post('/:entity', create);
router.put('/:entity/:id', update);
router.delete('/:entity/:id', remove);

// Generator Endpoint
router.post('/generate', generateTimetable);

export default router;
