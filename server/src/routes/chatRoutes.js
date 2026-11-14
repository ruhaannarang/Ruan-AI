import { Router } from 'express';
import { streamChat, abortChat } from '../controllers/chatController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

// POST /api/chat/stream (Protected: requires active authenticated session)
router.post('/stream', requireAuth, streamChat);

// POST /api/chat/abort (Protected: requires active authenticated session)
router.post('/abort', requireAuth, abortChat);

export default router;
