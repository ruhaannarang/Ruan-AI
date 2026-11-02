/**
 * Ruan AI — Voice Routes
 * Mounts STT transcription, TTS speech synthesis, and voice health endpoints.
 */

import express from 'express';
import multer from 'multer';
import * as voiceController from '../controllers/voiceController.js';

const router = express.Router();

// Memory storage for fast processing without persisting raw user recordings
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024 // 25 MB max upload
  }
});

/**
 * Handle multipart upload for 'file' or 'audio' field
 */
const handleAudioUpload = (req, res, next) => {
  upload.any()(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
          error: {
            message: 'Audio file exceeds maximum size limit of 25MB',
            code: 'FILE_TOO_LARGE',
            details: null
          }
        });
      }
      return res.status(400).json({
        error: {
          message: err.message,
          code: 'UPLOAD_ERROR',
          details: null
        }
      });
    } else if (err) {
      return next(err);
    }

    if (req.files && req.files.length > 0) {
      req.file = req.files[0];
    }
    next();
  });
};

router.post('/transcribe', handleAudioUpload, voiceController.transcribeAudio);
router.post('/synthesize', voiceController.synthesizeSpeech);
router.get('/health', voiceController.getVoiceHealth);
router.get('/voices', voiceController.getVoices);

// Phase 1.6.1 Hinglish Benchmark Routes
router.get('/benchmark/prompts', voiceController.getBenchmarkPrompts);
router.post('/benchmark/compare', handleAudioUpload, voiceController.compareBenchmarkSample);
router.post('/benchmark/save', handleAudioUpload, voiceController.saveBenchmarkSample);
router.get('/benchmark/history', voiceController.getBenchmarkHistory);
router.delete('/benchmark/history', voiceController.clearBenchmarkHistory);

export default router;

