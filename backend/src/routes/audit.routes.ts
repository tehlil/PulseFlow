import { Router } from 'express';
import { getAuditLogs } from '../controllers/audit.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { requirePermission } from '../middlewares/rbac.middleware';

const router = Router();

router.use(requireAuth);

router.get('/', requirePermission('audit_logs:read'), getAuditLogs);

export const auditRoutes = router;
export default auditRoutes;
