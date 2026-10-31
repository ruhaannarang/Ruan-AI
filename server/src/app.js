import express from 'express';
import cors from 'cors';
import { config } from './config/index.js';
import healthRoutes from './routes/healthRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

// Security: Bind CORS strictly to configured local client URL
app.use(
  cors({
    origin: [config.clientUrl, 'http://127.0.0.1:5173', 'http://localhost:5173'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  })
);

// Body parser
app.use(express.json());

// Request logging in development
if (config.nodeEnv === 'development') {
  app.use((req, res, next) => {
    console.log(`[Express] ${req.method} ${req.url}`);
    next();
  });
}

// Mount core endpoints
app.use('/api/health', healthRoutes);

// Fallback 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: {
      message: `Endpoint ${req.method} ${req.originalUrl} not found`,
      code: 'ROUTE_NOT_FOUND',
      details: null
    }
  });
});

// Centralized error handler
app.use(errorHandler);

// Start server on local loopback interface
const server = app.listen(config.port, config.host, () => {
  console.log(`[Ruan-Server] Running on http://${config.host}:${config.port}`);
  console.log(`[Ruan-Server] Environment: ${config.nodeEnv}`);
  console.log(`[Ruan-Server] Health check: http://${config.host}:${config.port}/api/health`);
});

export default app;
