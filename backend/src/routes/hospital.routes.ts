import { Router } from 'express';
import { getHospitals } from '../controllers/hospital.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { requirePermission } from '../middlewares/rbac.middleware';

const router = Router();

router.use(requireAuth);
router.get('/', requirePermission('hospitals:read'), getHospitals);

export const hospitalRoutes = router;
export default hospitalRoutes;
