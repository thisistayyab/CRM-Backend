import { Router } from 'express';
import { getAnalyticsOverview } from '../controllers/analytics.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';
const router = Router();

router.get('/overview', verifyJWT, getAnalyticsOverview);

export { router as analyticsRouter }; 