const express = require('express');
const { body } = require('express-validator');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

// Helper: send token response
const sendTokenResponse = (user, statusCode, res) => {
  const token = user.generateToken();

  res.status(statusCode).json({
    success: true,
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
};

// ─────────────────────────────────
// POST /api/auth/register
// Register a new user
// ─────────────────────────────────
router.post(
  '/register',
  validate([
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
    body('role')
      .optional()
      .isIn(['organizer', 'customer'])
      .withMessage('Role must be either organizer or customer'),
  ]),
  async (req, res) => {
    try {
      const { name, email, password, role } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'A user with this email already exists',
        });
      }

      // Create user
      const user = await User.create({ name, email, password, role });

      console.log(`👤 New ${user.role} registered: ${user.name} (${user.email})`);

      sendTokenResponse(user, 201, res);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Server error during registration',
        error: error.message,
      });
    }
  }
);

// ─────────────────────────────────
// POST /api/auth/login
// Login user
// ─────────────────────────────────
router.post(
  '/login',
  validate([
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password').notEmpty().withMessage('Password is required'),
  ]),
  async (req, res) => {
    try {
      const { email, password } = req.body;

      // Find user and include password field
      const user = await User.findOne({ email }).select('+password');
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials',
        });
      }

      // Check password
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials',
        });
      }

      console.log(`🔑 User logged in: ${user.name} (${user.role})`);

      sendTokenResponse(user, 200, res);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Server error during login',
        error: error.message,
      });
    }
  }
);

// ─────────────────────────────────
// GET /api/auth/me
// Get current logged-in user
// ─────────────────────────────────
router.get('/me', protect, async (req, res) => {
  res.status(200).json({
    success: true,
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
    },
  });
});

module.exports = router;
