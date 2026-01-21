/**
 * local server entry file, for local development
 */
import { createServer } from 'http';
import { Server } from 'socket.io';
import app from './app.js';
import { initDb } from './db.js';
import { startCleanupJob } from './utils/cleanup.js';

/**
 * Initialize database (async)
 */
initDb().catch((err) => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});

/**
 * Start cleanup job for expired webhooks (runs every hour)
 */
startCleanupJob(60);

/**
 * Create HTTP server
 */
const server = createServer(app);

/**
 * Initialize Socket.io
 */
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || '*',
    methods: ['GET', 'POST'],
  },
});

// Store io instance in app for use in routes
app.set('io', io);

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Join webhook room
  socket.on('join-webhook', (token: string) => {
    socket.join(`webhook:${token}`);
    console.log(`Client ${socket.id} joined webhook:${token}`);
  });

  // Leave webhook room
  socket.on('leave-webhook', (token: string) => {
    socket.leave(`webhook:${token}`);
    console.log(`Client ${socket.id} left webhook:${token}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

/**
 * start server with port
 */
const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`Server ready on port ${PORT}`);
});

/**
 * close server
 */
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export default app;