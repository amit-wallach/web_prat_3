import express from 'express';
import { registerStudent } from '../controllers/student.controller.js';

const router = express.Router();

// Route to handle POST request for student registration
router.post('/register-student', registerStudent);

export default router;
