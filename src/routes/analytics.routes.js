import { Router } from 'express';
import { getAnalyticsOverview, getDashboardInsights, getCustomers } from '../controllers/analytics.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';
const router = Router();

router.get('/overview', verifyJWT, getAnalyticsOverview);
router.get('/dashboard', verifyJWT, getDashboardInsights);
router.get('/customers', verifyJWT, getCustomers);

export { router as analyticsRouter }; 