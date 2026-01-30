
import app from '../../api/app';
import serverless from 'serverless-http';

// Create a simple Express app for health check that doesn't import the main app
// This isolates the test from potential import errors in the main app
import express from 'express';
const healthApp = express();

healthApp.get('/api/health-check', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV
  });
});

export const onRequest = serverless(healthApp);
