import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { signToken, requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/error.js';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many login attempts. Try again in a few minutes.' },
});

// POST /api/auth/login
router.post(
  '/login',
  loginLimiter,
  asyncHandler(async (req, res) => {
    const email = String(req.body.email || '').toLowerCase().trim();
    const password = String(req.body.password || '');
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const user = await User.findOne({ email });
    const ok = user ? await user.comparePassword(password) : false;
    if (!ok) return res.status(401).json({ message: 'Incorrect email or password.' });

    user.lastLoginAt = new Date();
    await user.save();

    res.json({ token: signToken(user), user: user.toSafeJSON() });
  })
);

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user.toSafeJSON(), demo: !env.mongoUri });
});

// PATCH /api/auth/password
router.patch(
  '/password',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || String(newPassword).length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters.' });
    }
    const ok = await req.user.comparePassword(String(currentPassword || ''));
    if (!ok) return res.status(401).json({ message: 'Current password is incorrect.' });

    req.user.passwordHash = await User.hashPassword(String(newPassword));
    await req.user.save();
    res.json({ message: 'Password updated.' });
  })
);

export default router;
