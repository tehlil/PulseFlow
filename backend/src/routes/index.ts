import { Router } from 'express';
import { healthRoutes } from './health.routes';
import { authRoutes } from './auth.routes';
import { patientRoutes } from './patient.routes';
import { hospitalRoutes } from './hospital.routes';
import { clinicalRoutes } from './clinical.routes';
import { predictionRoutes } from './prediction.routes';
import { analyticsRoutes } from './analytics.routes';
import { notificationRoutes } from './notification.routes';
import { auditRoutes } from './audit.routes';

const apiRouter = Router();

// Versioned routes
apiRouter.use('/auth', authRoutes);
apiRouter.use('/patients', patientRoutes);
apiRouter.use('/hospitals', hospitalRoutes);
apiRouter.use('/predictions', predictionRoutes);
apiRouter.use('/analytics', analyticsRoutes);
apiRouter.use('/notifications', notificationRoutes);
apiRouter.use('/audit-logs', auditRoutes);
apiRouter.use('/', clinicalRoutes);

export { healthRoutes, apiRouter };
export default apiRouter;
