import express from 'express';
import multer from 'multer';
import {getAvailabilityByUsername,
        getTutorByUsername,
        registerTutor, 
        searchTutors, 
        saveAvailability, 
        getMyAvailability, 
        deleteAvailability,
        bookLesson } from '../controllers/tutor.controller.js';

const router = express.Router();

// Configure multer to store uploaded files in memory
const storage = multer.memoryStorage();
const upload = multer({ storage });

/**
 * Route: POST /register-tutor
 * Description: Register a new tutor with optional profile photo upload
 */
router.post('/register-tutor', upload.single('profilePhoto'), registerTutor);

/**
 * Route: GET /search
 * Description: Search tutors by filters passed as query parameters
 * Example: /search?subject=math&location=tel+aviv&price=100
 */
router.get('/search', searchTutors);
router.post("/save-availability", saveAvailability);
router.get("/my-availability", getMyAvailability);
router.delete("/availability/:id", deleteAvailability);
router.get('/get-tutor/:username', getTutorByUsername);
router.get('/availability/:username', getAvailabilityByUsername);
router.post("/book-lesson", bookLesson);






export default router;
