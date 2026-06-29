import { Router } from 'express';
import { register, login, logout, refresh, me } from '../controllers/auth.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refresh);

// Protected routes
router.post('/logout', logout);
router.get('/me', requireAuth, me);

export const authRoutes = router;
export default authRoutes;
