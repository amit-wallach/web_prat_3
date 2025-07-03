// Import express and create a router
import express from 'express';
import { saveContactMessage } from '../controllers/contact.controller.js';

const router = express.Router();

// Define the route that handles the contact form submission
router.post('/contact', saveContactMessage);

// Export the router so it can be used in index.js
export default router;
