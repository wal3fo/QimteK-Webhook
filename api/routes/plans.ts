import { Router, type Request, type Response } from 'express';
import { authenticate, requireAdmin } from '../utils/auth.js';
import { getPlans, savePlans, type PlanConfig } from '../utils/plan-storage.js';

const router = Router();

/**
 * Get all plan configurations
 * Public endpoint (or authenticated if strictness is needed, but pricing info is usually public)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const plans = await getPlans();
    res.json({
      success: true,
      data: plans
    });
  } catch (error: any) {
    console.error('Error fetching plans:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch plan configuration'
    });
  }
});

/**
 * Update plan configuration
 * Admin only
 */
router.put('/', authenticate, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const newConfig = req.body;
    
    // Basic validation
    if (!newConfig || typeof newConfig !== 'object') {
      res.status(400).json({
        success: false,
        error: 'Invalid configuration data'
      });
      return;
    }

    // Ensure strict structure matching? 
    // For now, we trust the admin to send the correct structure, 
    // but in production we might want to validate against a schema (e.g. Zod).
    
    await savePlans(newConfig);
    
    res.json({
      success: true,
      message: 'Plan configuration updated successfully',
      data: newConfig
    });
  } catch (error: any) {
    console.error('Error updating plans:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update plan configuration'
    });
  }
});

export default router;
