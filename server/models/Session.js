const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: [true, 'Session name is required'],
    trim: true,
    maxlength: [100, 'Session name cannot exceed 100 characters']
  },
  type: {
    type: String,
    enum: ['strength', 'cardio', 'flexibility', 'mixed', 'custom'],
    default: 'mixed'
  },
  startTime: {
    type: Date,
    required: true,
    default: Date.now
  },
  endTime: {
    type: Date
  },
  duration: {
    type: Number, // in minutes
    default: 0
  },
  exercises: [{
    exerciseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Exercise'
    },
    name: {
      type: String,
      required: true
    },
    sets: [{
      reps: {
        type: Number,
        default: 0
      },
      weight: {
        type: Number,
        default: 0
      },
      duration: {
        type: Number, // in seconds
        default: 0
      },
      formScore: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
      },
      feedback: [{
        type: String,
        enum: ['good_form', 'adjust_angle', 'slow_down', 'keep_straight', 'breathe', 'other']
      }],
      videoUrl: String,
      timestamp: {
        type: Date,
        default: Date.now
      }
    }],
    totalSets: {
      type: Number,
      default: 0
    },
    totalReps: {
      type: Number,
      default: 0
    },
    averageFormScore: {
      type: Number,
      default: 0
    }
  }],
  overallFormScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  caloriesBurned: {
    type: Number,
    default: 0
  },
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  isCompleted: {
    type: Boolean,
    default: false
  },
  aiAnalysis: {
    overallScore: {
      type: Number,
      min: 0,
      max: 100
    },
    recommendations: [String],
    riskFactors: [String],
    improvementAreas: [String],
    analyzedAt: {
      type: Date,
      default: Date.now
    }
  }
}, {
  timestamps: true
});

// Calculate session duration when endTime is set
sessionSchema.pre('save', function(next) {
  if (this.endTime && this.startTime) {
    this.duration = Math.round((this.endTime - this.startTime) / (1000 * 60)); // Convert to minutes
  }
  next();
});

// Calculate overall form score from exercises
sessionSchema.methods.calculateOverallFormScore = function() {
  if (!this.exercises || this.exercises.length === 0) return 0;
  
  const totalScore = this.exercises.reduce((sum, exercise) => {
    return sum + (exercise.averageFormScore || 0);
  }, 0);
  
  return Math.round(totalScore / this.exercises.length);
};

// Virtual for session status
sessionSchema.virtual('status').get(function() {
  if (this.isCompleted) return 'completed';
  if (this.endTime) return 'finished';
  return 'active';
});

// Index for better query performance
sessionSchema.index({ userId: 1, startTime: -1 });
sessionSchema.index({ userId: 1, isCompleted: 1 });

module.exports = mongoose.model('Session', sessionSchema); 