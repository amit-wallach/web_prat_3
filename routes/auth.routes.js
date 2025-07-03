import express from 'express';
import * as authController from '../controllers/auth.controller.js';

const router = express.Router();

router.post('/login', authController.loginUser);
router.get('/logout', authController.logoutUser);
router.get("/profile", authController.renderProfilePage);
router.get("/my-lessons", authController.getMyLessons);
router.post("/submit-review", authController.submitReview);




export default router;
