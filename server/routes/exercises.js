const express = require('express');
const { body, validationResult } = require('express-validator');
const Exercise = require('../models/Exercise');
const auth = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/exercises
// @desc    Get all exercises with filtering
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { 
      category, 
      muscleGroup, 
      difficulty, 
      equipment, 
      search,
      page = 1, 
      limit = 20 
    } = req.query;
    
    const query = { isActive: true };
    
    if (category) query.category = category;
    if (difficulty) query.difficulty = difficulty;
    if (equipment) query.equipment = equipment;
    if (muscleGroup) query.muscleGroups = muscleGroup;
    if (search) {
      query.$text = { $search: search };
    }
    
    const exercises = await Exercise.find(query)
      .sort({ popularity: -1, name: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-formCheckpoints -commonMistakes -variations');
    
    const total = await Exercise.countDocuments(query);
    
    res.json({
      exercises,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
    
  } catch (error) {
    console.error('Get exercises error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/exercises/:id
// @desc    Get exercise by ID with full details
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const exercise = await Exercise.findById(req.params.id);
    
    if (!exercise || !exercise.isActive) {
      return res.status(404).json({ message: 'Exercise not found' });
    }
    
    res.json({ exercise });
    
  } catch (error) {
    console.error('Get exercise error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/exercises/categories/list
// @desc    Get list of all exercise categories
// @access  Public
router.get('/categories/list', async (req, res) => {
  try {
    const categories = await Exercise.distinct('category');
    res.json({ categories });
    
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/exercises/muscle-groups/list
// @desc    Get list of all muscle groups
// @access  Public
router.get('/muscle-groups/list', async (req, res) => {
  try {
    const muscleGroups = await Exercise.distinct('muscleGroups');
    res.json({ muscleGroups });
    
  } catch (error) {
    console.error('Get muscle groups error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/exercises/equipment/list
// @desc    Get list of all equipment types
// @access  Public
router.get('/equipment/list', async (req, res) => {
  try {
    const equipment = await Exercise.distinct('equipment');
    res.json({ equipment });
    
  } catch (error) {
    console.error('Get equipment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/exercises/popular
// @desc    Get popular exercises
// @access  Public
router.get('/popular', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const exercises = await Exercise.find({ isActive: true })
      .sort({ popularity: -1, averageRating: -1 })
      .limit(parseInt(limit))
      .select('name category muscleGroups difficulty averageRating popularity');
    
    res.json({ exercises });
    
  } catch (error) {
    console.error('Get popular exercises error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/exercises/recommended
// @desc    Get recommended exercises based on user preferences
// @access  Private
router.get('/recommended', auth, async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    // Get user's preferred exercises and fitness level
    const user = await require('../models/User').findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const query = { 
      isActive: true,
      difficulty: { $lte: user.fitnessLevel === 'beginner' ? 'beginner' : user.fitnessLevel }
    };
    
    // If user has preferred exercises, prioritize them
    if (user.preferences.preferredExercises && user.preferences.preferredExercises.length > 0) {
      query.$or = [
        { name: { $in: user.preferences.preferredExercises } },
        { category: { $in: ['strength', 'cardio'] } }
      ];
    }
    
    const exercises = await Exercise.find(query)
      .sort({ popularity: -1, averageRating: -1 })
      .limit(parseInt(limit))
      .select('name category muscleGroups difficulty averageRating popularity');
    
    res.json({ exercises });
    
  } catch (error) {
    console.error('Get recommended exercises error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/exercises/:id/rate
// @desc    Rate an exercise
// @access  Private
router.post('/:id/rate', [
  auth,
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array() 
      });
    }

    const { rating } = req.body;
    const exercise = await Exercise.findById(req.params.id);
    
    if (!exercise || !exercise.isActive) {
      return res.status(404).json({ message: 'Exercise not found' });
    }
    
    // Update rating
    const newTotalRatings = exercise.totalRatings + 1;
    const newAverageRating = ((exercise.averageRating * exercise.totalRatings) + rating) / newTotalRatings;
    
    exercise.averageRating = newAverageRating;
    exercise.totalRatings = newTotalRatings;
    
    await exercise.save();
    
    res.json({
      message: 'Rating submitted successfully',
      exercise: {
        id: exercise._id,
        name: exercise.name,
        averageRating: exercise.averageRating,
        totalRatings: exercise.totalRatings
      }
    });
    
  } catch (error) {
    console.error('Rate exercise error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/exercises/:id/increment-popularity
// @desc    Increment exercise popularity (called when exercise is used)
// @access  Private
router.post('/:id/increment-popularity', auth, async (req, res) => {
  try {
    const exercise = await Exercise.findByIdAndUpdate(
      req.params.id,
      { $inc: { popularity: 1 } },
      { new: true }
    );
    
    if (!exercise) {
      return res.status(404).json({ message: 'Exercise not found' });
    }
    
    res.json({ message: 'Popularity updated' });
    
  } catch (error) {
    console.error('Increment popularity error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 