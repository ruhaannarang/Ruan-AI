import { Router } from 'express';
import { generateImage, editImage, getImageStatus } from '../controllers/imageController.js';

const router = Router();

router.post('/generate', generateImage);
router.post('/edit', editImage);
router.get('/status', getImageStatus);

export default router;

