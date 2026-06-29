import { Router } from 'express';
import { generatePredictionTrigger, getPredictionById } from '../controllers/prediction.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { requirePermission } from '../middlewares/rbac.middleware';

const router = Router();

router.use(requireAuth);

router.post('/generate', requirePermission('predictions:write'), generatePredictionTrigger);
router.get('/:id', requirePermission('predictions:read'), getPredictionById);

export const predictionRoutes = router;
export default predictionRoutes;
