import express from 'express';
import {
  getAuthConfig,
  handleGoogleAuth,
  getCurrentUser,
  logout
} from '../controllers/authController.js';
import { requireAuth, optionalAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public configuration endpoint
router.get('/config', getAuthConfig);

// Google Sign-In verification endpoint
router.post('/google', handleGoogleAuth);

// Authenticated session profile endpoint
router.get('/me', requireAuth, getCurrentUser);

// Session termination endpoint
router.post('/logout', optionalAuth, logout);

export default router;
