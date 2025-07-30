const express = require('express');
const { body, validationResult } = require('express-validator');
const Session = require('../models/Session');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/sessions
// @desc    Get all sessions for current user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, type, completed } = req.query;
    
    const query = { userId: req.user.userId };
    
    if (type) query.type = type;
    if (completed !== undefined) query.isCompleted = completed === 'true';
    
    const sessions = await Session.find(query)
      .sort({ startTime: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('exercises.exerciseId', 'name category muscleGroups');
    
    const total = await Session.countDocuments(query);
    
    res.json({
      sessions,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
    
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/sessions/:id
// @desc    Get session by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const session = await Session.findOne({
      _id: req.params.id,
      userId: req.user.userId
    }).populate('exercises.exerciseId', 'name category muscleGroups instructions tips');
    
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    
    res.json({ session });
    
  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/sessions
// @desc    Create a new session
// @access  Private
router.post('/', [
  auth,
  body('name')
    .isLength({ min: 1, max: 100 })
    .withMessage('Session name is required and must be less than 100 characters'),
  body('type')
    .optional()
    .isIn(['strength', 'cardio', 'flexibility', 'mixed', 'custom'])
    .withMessage('Invalid session type')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array() 
      });
    }

    const { name, type = 'mixed', exercises = [] } = req.body;
    
    const session = new Session({
      userId: req.user.userId,
      name,
      type,
      exercises,
      startTime: new Date()
    });
    
    await session.save();
    
    // Update user stats
    await User.findByIdAndUpdate(req.user.userId, {
      $inc: { 'stats.totalSessions': 1 }
    });
    
    res.status(201).json({
      message: 'Session created successfully',
      session
    });
    
  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/sessions/:id
// @desc    Update session
// @access  Private
router.put('/:id', [
  auth,
  body('name')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Session name must be less than 100 characters'),
  body('type')
    .optional()
    .isIn(['strength', 'cardio', 'flexibility', 'mixed', 'custom'])
    .withMessage('Invalid session type')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array() 
      });
    }

    const session = await Session.findOne({
      _id: req.params.id,
      userId: req.user.userId
    });
    
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    
    const { name, type, exercises, endTime, isCompleted, notes } = req.body;
    
    if (name) session.name = name;
    if (type) session.type = type;
    if (exercises) session.exercises = exercises;
    if (endTime) session.endTime = new Date(endTime);
    if (isCompleted !== undefined) session.isCompleted = isCompleted;
    if (notes) session.notes = notes;
    
    // Calculate overall form score
    if (exercises) {
      session.overallFormScore = session.calculateOverallFormScore();
    }
    
    await session.save();
    
    res.json({
      message: 'Session updated successfully',
      session
    });
    
  } catch (error) {
    console.error('Update session error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/sessions/:id
// @desc    Delete session
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const session = await Session.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.userId
    });
    
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    
    // Update user stats
    await User.findByIdAndUpdate(req.user.userId, {
      $inc: { 'stats.totalSessions': -1 }
    });
    
    res.json({ message: 'Session deleted successfully' });
    
  } catch (error) {
    console.error('Delete session error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/sessions/:id/complete
// @desc    Complete a session
// @access  Private
router.post('/:id/complete', auth, async (req, res) => {
  try {
    const session = await Session.findOne({
      _id: req.params.id,
      userId: req.user.userId
    });
    
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    
    session.endTime = new Date();
    session.isCompleted = true;
    session.overallFormScore = session.calculateOverallFormScore();
    
    await session.save();
    
    // Update user stats
    const user = await User.findById(req.user.userId);
    user.stats.totalWorkoutTime += session.duration || 0;
    
    // Calculate new average form score
    const allSessions = await Session.find({
      userId: req.user.userId,
      isCompleted: true
    });
    
    const totalFormScore = allSessions.reduce((sum, s) => sum + (s.overallFormScore || 0), 0);
    user.stats.averageFormScore = allSessions.length > 0 ? totalFormScore / allSessions.length : 0;
    
    await user.save();
    
    res.json({
      message: 'Session completed successfully',
      session
    });
    
  } catch (error) {
    console.error('Complete session error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/sessions/stats/summary
// @desc    Get session statistics summary
// @access  Private
router.get('/stats/summary', auth, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    
    const sessions = await Session.find({
      userId: req.user.userId,
      startTime: { $gte: startDate },
      isCompleted: true
    });
    
    const totalSessions = sessions.length;
    const totalDuration = sessions.reduce((sum, session) => sum + (session.duration || 0), 0);
    const averageFormScore = sessions.length > 0 
      ? sessions.reduce((sum, session) => sum + (session.overallFormScore || 0), 0) / sessions.length 
      : 0;
    
    const sessionsByType = sessions.reduce((acc, session) => {
      acc[session.type] = (acc[session.type] || 0) + 1;
      return acc;
    }, {});
    
    res.json({
      totalSessions,
      totalDuration,
      averageFormScore: Math.round(averageFormScore),
      sessionsByType,
      period: `${days} days`
    });
    
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 