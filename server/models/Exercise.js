const mongoose = require('mongoose');

const exerciseSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Exercise name is required'],
    unique: true,
    trim: true,
    maxlength: [100, 'Exercise name cannot exceed 100 characters']
  },
  category: {
    type: String,
    enum: ['strength', 'cardio', 'flexibility', 'balance', 'sports'],
    required: true
  },
  muscleGroups: [{
    type: String,
    enum: [
      'chest', 'back', 'shoulders', 'biceps', 'triceps', 
      'forearms', 'abs', 'obliques', 'glutes', 'quadriceps', 
      'hamstrings', 'calves', 'full_body', 'core'
    ]
  }],
  equipment: [{
    type: String,
    enum: [
      'none', 'dumbbells', 'barbell', 'kettlebell', 'resistance_bands',
      'pull_up_bar', 'bench', 'mat', 'treadmill', 'elliptical',
      'bicycle', 'rower', 'cable_machine', 'smith_machine'
    ]
  }],
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    required: true
  },
  instructions: {
    type: String,
    required: [true, 'Exercise instructions are required'],
    maxlength: [1000, 'Instructions cannot exceed 1000 characters']
  },
  tips: [{
    type: String,
    maxlength: [200, 'Tip cannot exceed 200 characters']
  }],
  videoUrl: {
    type: String,
    validate: {
      validator: function(v) {
        return /^https?:\/\/.+/.test(v) || v === '';
      },
      message: 'Video URL must be a valid URL'
    }
  },
  imageUrl: {
    type: String,
    validate: {
      validator: function(v) {
        return /^https?:\/\/.+/.test(v) || v === '';
      },
      message: 'Image URL must be a valid URL'
    }
  },
  aiModel: {
    type: String,
    default: 'pose_estimation_v1'
  },
  formCheckpoints: [{
    name: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    keyPoints: [{
      joint: {
        type: String,
        enum: [
          'nose', 'left_eye', 'right_eye', 'left_ear', 'right_ear',
          'left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow',
          'left_wrist', 'right_wrist', 'left_hip', 'right_hip',
          'left_knee', 'right_knee', 'left_ankle', 'right_ankle'
        ]
      },
      position: {
        type: String,
        enum: ['above', 'below', 'aligned', 'behind', 'in_front']
      },
      angle: {
        min: Number,
        max: Number
      }
    }]
  }],
  commonMistakes: [{
    description: {
      type: String,
      required: true
    },
    correction: {
      type: String,
      required: true
    }
  }],
  variations: [{
    name: {
      type: String,
      required: true
    },
    description: String,
    difficulty: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced']
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  popularity: {
    type: Number,
    default: 0
  },
  averageRating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0
  },
  totalRatings: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index for better query performance
exerciseSchema.index({ category: 1, difficulty: 1 });
exerciseSchema.index({ muscleGroups: 1 });
exerciseSchema.index({ name: 'text' });

// Virtual for full exercise info
exerciseSchema.virtual('fullInfo').get(function() {
  return {
    id: this._id,
    name: this.name,
    category: this.category,
    muscleGroups: this.muscleGroups,
    difficulty: this.difficulty,
    equipment: this.equipment,
    instructions: this.instructions,
    videoUrl: this.videoUrl,
    imageUrl: this.imageUrl,
    popularity: this.popularity,
    averageRating: this.averageRating
  };
});

module.exports = mongoose.model('Exercise', exerciseSchema); 