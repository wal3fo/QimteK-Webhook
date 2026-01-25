import { Router, Request, Response } from 'express';
import { visitorService } from '../services/visitor-service.js';

const router = Router();

// Join - Visitor enters the site
router.post('/join', (req: Request, res: Response) => {
  const { sessionId } = req.body;
  if (!sessionId) {
    res.status(400).json({ error: 'sessionId required' });
    return;
  }
  console.log(`Visitor joined: ${sessionId}`);
  visitorService.join(sessionId);
  res.json({ success: true });
});

// Leave - Visitor closes tab/leaves
router.post('/leave', (req: Request, res: Response) => {
  const { sessionId } = req.body;
  if (sessionId) {
    visitorService.leave(sessionId);
  }
  // Always return success for beacon/unload events
  res.json({ success: true });
});

// Heartbeat - Keep session alive
router.post('/heartbeat', (req: Request, res: Response) => {
  const { sessionId } = req.body;
  if (sessionId) {
    visitorService.heartbeat(sessionId);
  }
  res.json({ success: true });
});

// Stats - Get current counts
router.get('/stats', async (req: Request, res: Response) => {
  const stats = await visitorService.getStats();
  // console.log('Visitor stats:', stats);
  res.json(stats);
});

export default router;
