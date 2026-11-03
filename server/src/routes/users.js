import { Router } from 'express';
import { User } from '../models/User.js';
import { Lead } from '../models/Lead.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/error.js';

const router = Router();
router.use(requireAuth);

// GET /api/users — admins see the team, everyone sees at least themselves
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const users =
      req.user.role === 'admin'
        ? await User.find().sort({ createdAt: 1 })
        : [req.user];
    res.json({ users: users.map((u) => u.toSafeJSON()) });
  })
);

// POST /api/users (admin)
router.post(
  '/',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const { name, email, password, role = 'telecaller', phone = '' } = req.body || {};
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required.' });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }
    const exists = await User.findOne({ email: String(email).toLowerCase() });
    if (exists) return res.status(409).json({ message: 'That email is already in use.' });

    const user = await User.create({
      name,
      email,
      phone,
      role: ['admin', 'telecaller', 'yard'].includes(role) ? role : 'telecaller',
      passwordHash: await User.hashPassword(String(password)),
    });
    res.status(201).json({ user: user.toSafeJSON() });
  })
);

// PATCH /api/users/:id (admin)
router.patch(
  '/:id',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    const { name, phone, role, active, password } = req.body || {};
    if (name !== undefined) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (role !== undefined && ['admin', 'telecaller', 'yard'].includes(role)) user.role = role;
    if (active !== undefined) user.active = Boolean(active);
    if (password) {
      if (String(password).length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters.' });
      }
      user.passwordHash = await User.hashPassword(String(password));
    }
    await user.save();

    // Keep the denormalised name on leads in sync.
    if (name !== undefined) {
      await Lead.updateMany({ assignedTo: user._id }, { assignedToName: name });
    }
    res.json({ user: user.toSafeJSON() });
  })
);

export default router;
