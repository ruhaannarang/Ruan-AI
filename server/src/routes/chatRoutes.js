import { Router } from 'express';
import { streamChat, abortChat } from '../controllers/chatController.js';

const router = Router();

// POST /api/chat/stream
router.post('/stream', streamChat);

// POST /api/chat/abort
router.post('/abort', abortChat);

export default router;
