import { Router } from 'express';
import { getAnalyticsOverview } from '../controllers/analytics.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/overview', getAnalyticsOverview);

export const analyticsRoutes = router;
export default analyticsRoutes;
