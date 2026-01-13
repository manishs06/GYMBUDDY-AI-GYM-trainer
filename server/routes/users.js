const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/users/profile
// @desc    Get current user profile
// @access  Private
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user: user.getPublicProfile() });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', [
  auth,
  body('username')
    .optional()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('fitnessLevel')
    .optional()
    .isIn(['beginner', 'intermediate', 'advanced'])
    .withMessage('Invalid fitness level'),
  body('goals')
    .optional()
    .isArray()
    .withMessage('Goals must be an array'),
  body('preferences.workoutDuration')
    .optional()
    .isInt({ min: 15, max: 180 })
    .withMessage('Workout duration must be between 15 and 180 minutes'),
  body('preferences.preferredExercises')
    .optional()
    .isArray()
    .withMessage('Preferred exercises must be an array'),
  body('biometrics.age')
    .optional()
    .isInt({ min: 10, max: 120 })
    .withMessage('Age must be between 10 and 120'),
  body('biometrics.weight')
    .optional()
    .isFloat({ min: 20 })
    .withMessage('Weight must be reasonable'),
  body('biometrics.height')
    .optional()
    .isFloat({ min: 50 })
    .withMessage('Height must be reasonable'),
  body('biometrics.gender')
    .optional()
    .isIn(['male', 'female', 'other'])
    .withMessage('Invalid gender'),
  body('preferences.notifications')
    .optional()
    .isBoolean()
    .withMessage('Notifications must be a boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const {
      username,
      fitnessLevel,
      goals,
      biometrics,
      preferences,
      profilePicture
    } = req.body;

    // Check if username is being changed and if it's already taken
    if (username && username !== user.username) {
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.status(400).json({ message: 'Username already taken' });
      }
      user.username = username;
    }

    if (fitnessLevel) user.fitnessLevel = fitnessLevel;
    if (goals) user.goals = goals;
    if (profilePicture) user.profilePicture = profilePicture;

    if (biometrics) {
      if (!user.biometrics) user.biometrics = {};
      if (biometrics.age) user.biometrics.age = biometrics.age;
      if (biometrics.weight) user.biometrics.weight = biometrics.weight;
      if (biometrics.height) user.biometrics.height = biometrics.height;
      if (biometrics.gender) user.biometrics.gender = biometrics.gender;
    }

    if (preferences) {
      if (preferences.workoutDuration) user.preferences.workoutDuration = preferences.workoutDuration;
      if (preferences.preferredExercises) user.preferences.preferredExercises = preferences.preferredExercises;
      if (preferences.notifications !== undefined) user.preferences.notifications = preferences.notifications;
    }

    await user.save();

    res.json({
      message: 'Profile updated successfully',
      user: user.getPublicProfile()
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/users/stats
// @desc    Get user statistics
// @access  Private
router.get('/stats', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      stats: user.stats,
      fitnessLevel: user.fitnessLevel,
      goals: user.goals
    });

  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/users/account
// @desc    Delete user account
// @access  Private
router.delete('/account', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // In a real application, you might want to:
    // 1. Delete all user sessions
    // 2. Delete all user data
    // 3. Send confirmation email
    // 4. Implement soft delete instead of hard delete

    await User.findByIdAndDelete(req.user.userId);

    res.json({ message: 'Account deleted successfully' });

  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/users/change-password
// @desc    Change user password
// @access  Private
router.post('/change-password', [
  auth,
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
    .matches(/\d/)
    .withMessage('New password must contain at least one number')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Set new password
    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password changed successfully' });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/users/leaderboard
// @desc    Get leaderboard (top users by stats)
// @access  Public
router.get('/leaderboard', async (req, res) => {
  try {
    const { metric = 'totalSessions', limit = 10 } = req.query;

    const validMetrics = ['totalSessions', 'totalWorkoutTime', 'averageFormScore', 'streakDays'];
    if (!validMetrics.includes(metric)) {
      return res.status(400).json({ message: 'Invalid metric' });
    }

    const users = await User.find({ isActive: true })
      .sort({ [`stats.${metric}`]: -1 })
      .limit(parseInt(limit))
      .select('username stats.fitnessLevel stats');

    res.json({
      leaderboard: users.map(user => ({
        username: user.username,
        fitnessLevel: user.stats.fitnessLevel,
        [metric]: user.stats[metric]
      })),
      metric
    });

  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 