import { Router } from 'express';
import {
  createAssessment,
  getAssessmentById,
  updateAssessment,
  deleteAssessment,
  getPatientAssessments,
  createVisit,
  getPatientVisits,
} from '../controllers/clinical.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { requirePermission } from '../middlewares/rbac.middleware';

const router = Router();

router.use(requireAuth);

// Clinical Assessments routes
router.post('/assessments', requirePermission('assessments:write'), createAssessment);
router.get('/assessments/:id', requirePermission('assessments:read'), getAssessmentById);
router.put('/assessments/:id', requirePermission('assessments:write'), updateAssessment);
router.delete('/assessments/:id', requirePermission('assessments:write'), deleteAssessment);
router.get('/patients/:patientId/assessments', requirePermission('assessments:read'), getPatientAssessments);

// Visit logs routes
router.post('/visits', requirePermission('patients:write'), createVisit);
router.get('/patients/:patientId/visits', requirePermission('patients:read'), getPatientVisits);

export const clinicalRoutes = router;
export default clinicalRoutes;
