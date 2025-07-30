const express = require('express');
const multer = require('multer');
const axios = require('axios');
const auth = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image and video files are allowed'), false);
    }
  }
});

// @route   POST /api/ai/analyze-form
// @desc    Analyze exercise form using Python AI backend
// @access  Private
router.post('/analyze-form', [
  auth,
  upload.single('media')
], async (req, res) => {
  try {
    const { exerciseId, exerciseName } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: 'No media file provided' });
    }

    // Prepare data for Python backend
    const formData = new FormData();
    formData.append('media', file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype
    });
    formData.append('exerciseId', exerciseId);
    formData.append('exerciseName', exerciseName);
    formData.append('userId', req.user.userId);

    // Call Python AI backend
    const pythonBackendUrl = process.env.PYTHON_BACKEND_URL || 'http://localhost:8000';
    
    const response = await axios.post(`${pythonBackendUrl}/api/analyze-form`, formData, {
      headers: {
        ...formData.getHeaders(),
        'Content-Type': 'multipart/form-data'
      },
      timeout: 30000 // 30 second timeout
    });

    res.json(response.data);

  } catch (error) {
    console.error('Form analysis error:', error);
    
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({ 
        message: 'AI analysis service is currently unavailable' 
      });
    }
    
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    
    res.status(500).json({ message: 'Error analyzing form' });
  }
});

// @route   POST /api/ai/real-time-analysis
// @desc    Real-time form analysis for live workouts
// @access  Private
router.post('/real-time-analysis', [
  auth,
  upload.single('frame')
], async (req, res) => {
  try {
    const { exerciseId, sessionId } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: 'No frame provided' });
    }

    // Prepare data for Python backend
    const formData = new FormData();
    formData.append('frame', file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype
    });
    formData.append('exerciseId', exerciseId);
    formData.append('sessionId', sessionId);
    formData.append('userId', req.user.userId);

    // Call Python AI backend for real-time analysis
    const pythonBackendUrl = process.env.PYTHON_BACKEND_URL || 'http://localhost:8000';
    
    const response = await axios.post(`${pythonBackendUrl}/api/real-time-analysis`, formData, {
      headers: {
        ...formData.getHeaders(),
        'Content-Type': 'multipart/form-data'
      },
      timeout: 10000 // 10 second timeout for real-time
    });

    res.json(response.data);

  } catch (error) {
    console.error('Real-time analysis error:', error);
    
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({ 
        message: 'AI analysis service is currently unavailable' 
      });
    }
    
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    
    res.status(500).json({ message: 'Error in real-time analysis' });
  }
});

// @route   GET /api/ai/exercise-suggestions
// @desc    Get AI-powered exercise suggestions
// @access  Private
router.get('/exercise-suggestions', auth, async (req, res) => {
  try {
    const { fitnessLevel, goals, recentExercises } = req.query;

    // Call Python backend for exercise suggestions
    const pythonBackendUrl = process.env.PYTHON_BACKEND_URL || 'http://localhost:8000';
    
    const response = await axios.get(`${pythonBackendUrl}/api/exercise-suggestions`, {
      params: {
        fitnessLevel,
        goals,
        recentExercises,
        userId: req.user.userId
      },
      timeout: 15000
    });

    res.json(response.data);

  } catch (error) {
    console.error('Exercise suggestions error:', error);
    
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({ 
        message: 'AI suggestion service is currently unavailable' 
      });
    }
    
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    
    res.status(500).json({ message: 'Error getting exercise suggestions' });
  }
});

// @route   POST /api/ai/workout-plan
// @desc    Generate personalized workout plan
// @access  Private
router.post('/workout-plan', [
  auth,
  body('fitnessLevel').isIn(['beginner', 'intermediate', 'advanced']),
  body('goals').isArray(),
  body('availableTime').isInt({ min: 15, max: 180 }),
  body('equipment').optional().isArray()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array() 
      });
    }

    const { fitnessLevel, goals, availableTime, equipment = [] } = req.body;

    // Call Python backend for workout plan generation
    const pythonBackendUrl = process.env.PYTHON_BACKEND_URL || 'http://localhost:8000';
    
    const response = await axios.post(`${pythonBackendUrl}/api/workout-plan`, {
      fitnessLevel,
      goals,
      availableTime,
      equipment,
      userId: req.user.userId
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    res.json(response.data);

  } catch (error) {
    console.error('Workout plan generation error:', error);
    
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({ 
        message: 'AI workout planning service is currently unavailable' 
      });
    }
    
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    
    res.status(500).json({ message: 'Error generating workout plan' });
  }
});

// @route   GET /api/ai/health
// @desc    Check AI backend health
// @access  Public
router.get('/health', async (req, res) => {
  try {
    const pythonBackendUrl = process.env.PYTHON_BACKEND_URL || 'http://localhost:8000';
    
    const response = await axios.get(`${pythonBackendUrl}/health`, {
      timeout: 5000
    });

    res.json({
      status: 'healthy',
      pythonBackend: response.data,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('AI health check error:', error);
    
    res.status(503).json({
      status: 'unhealthy',
      pythonBackend: 'unavailable',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router; 