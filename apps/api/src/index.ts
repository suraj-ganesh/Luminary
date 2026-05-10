import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load env vars FIRST before anything else uses process.env
dotenv.config();

import { createClient } from '@supabase/supabase-js';
import scanRouter from './routes/scan';
import monitoringRouter from './routes/monitoring';
import apiKeysRouter from './routes/apiKeys';
import publicApiRouter from './routes/publicApi';
import stripeRouter from './routes/stripe';
import testEmailRouter from './routes/testEmail';
import orgsRouter from './routes/orgs';
import webhooksRouter from './routes/webhooks';
import remediationRouter from './routes/remediation';
import notificationsRouter from './routes/notifications';
import historyRouter from './routes/history';
import './queues/scanQueue'; // This starts the worker
console.log('Scan Worker initialized and listening for jobs...');

export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const app = express();
const port = process.env.PORT || 8080;

app.use(cors());
app.use((req, res, next) => {
  console.log(`${req.method} ${req.originalUrl}`); // DEBUG LOG
  if (req.originalUrl === '/api/stripe/webhook') {
    next();
  } else {
    express.json()(req, res, next);
  }
});

// Routes
app.use('/api/scan', scanRouter);
app.use('/api/monitoring', monitoringRouter);
app.use('/api/keys', apiKeysRouter);
app.use('/api/public', publicApiRouter);
app.use('/api/stripe', stripeRouter);
app.use('/api/test-email', testEmailRouter);
app.use('/api/orgs', orgsRouter);
app.use('/api/webhooks', webhooksRouter);
app.use('/api/remediation', remediationRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/history', historyRouter);

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

app.listen(port, () => {
  console.log(`API server running on port ${port}`);
});
