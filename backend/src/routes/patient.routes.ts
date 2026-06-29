import { Router } from 'express';
import {
  createPatient,
  getPatients,
  getPatientById,
  updatePatient,
  deletePatient,
} from '../controllers/patient.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { requirePermission } from '../middlewares/rbac.middleware';

const router = Router();

router.use(requireAuth);

router.post('/', requirePermission('patients:write'), createPatient);
router.get('/', requirePermission('patients:read'), getPatients);
router.get('/:id', requirePermission('patients:read'), getPatientById);
router.put('/:id', requirePermission('patients:write'), updatePatient);
router.delete('/:id', requirePermission('patients:write'), deletePatient);

export const patientRoutes = router;
export default patientRoutes;
