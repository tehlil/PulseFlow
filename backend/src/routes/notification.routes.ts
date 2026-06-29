import { Router } from 'express';
import { getNotifications, markNotificationAsRead } from '../controllers/notification.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/', getNotifications);
router.put('/:id/read', markNotificationAsRead);

export const notificationRoutes = router;
export default notificationRoutes;
