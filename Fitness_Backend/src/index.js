import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import authRoutes from './routes/authRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import calculationRoutes from './routes/calculationRoutes.js';
import resourceRoutes from './routes/resourceRoutes.js';
import trackingRoutes from './routes/trackingRoutes.js';

const app = express();
const port = process.env.PORT || 3000;

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('combined'));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api', calculationRoutes);
app.use('/api', resourceRoutes);
app.use('/api', trackingRoutes);

app.use((err, _req, res, _next) => {
  console.error('Unhandled request error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const server = app.listen(port, () => {
  console.log(`Fitness API running on http://localhost:${port}`);
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.log(`Fitness API is already running on http://localhost:${port}. Reusing the existing process.`);
    return;
  }
  console.error('Failed to start Fitness API:', error);
  process.exitCode = 1;
});
