# GYMBUDDY-AI-GYM-trainer

A comprehensive fitness tracking application built with the MERN stack, enhanced with AI-powered exercise detection and form analysis. This project provides a complete AI-powered fitness trainer with real-time exercise tracking and form feedback.

## 🚀 Features

### AI-Powered Fitness Tracking
- **Real-time Exercise Detection**: Uses MediaPipe for accurate pose tracking
- **Automatic Rep Counting**: Counts repetitions for push-ups, pull-ups, sit-ups, squats, and walking
- **Form Analysis**: Provides real-time feedback on exercise technique
- **Webcam Integration**: Live workout sessions with AI feedback
- **Exercise Form Analysis**: Upload videos/images for detailed form analysis

### Traditional Fitness Features
- User authentication and account management
- Exercise session tracking with detailed metrics
- Form quality scoring system
- Progress tracking and history
- Database storage for user data and exercise sessions
- Personalized workout plans and recommendations

## 🏗️ Project Structure

```
GYMBUDDY-AI-GYM-trainer/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   │   ├── AIWorkoutSession.js
│   │   │   └── ExerciseFormAnalysis.js
│   │   └── pages/         # React pages
├── server/                 # Node.js/Express backend
│   ├── routes/
│   │   └── ai.js          # AI integration endpoints
│   ├── models/            # MongoDB models
│   └── middleware/        # Authentication middleware
├── ai_backend/            # Python AI backend
│   ├── main.py            # Flask AI server
│   ├── body_part_angle.py # Angle calculations
│   ├── types_of_exercise.py # Exercise detection
│   ├── utils.py           # Helper functions
│   └── requirements.txt   # Python dependencies
├── start_ai_fitness_app.py # Startup script
└── AI_INTEGRATION_README.md # AI integration guide
```

## 🛠️ Setup Instructions

### Quick Start (Recommended)
```bash
# Run the startup script to automatically set up everything
python start_ai_fitness_app.py
```

### Manual Setup

1. **Install AI Backend Dependencies**
   ```bash
   cd ai_backend
   pip install -r requirements.txt
   ```

2. **Start AI Backend**
   ```bash
   cd ai_backend
   python main.py
   ```

3. **Install MERN Stack Dependencies**
   ```bash
   # Install server dependencies
   cd server
   npm install
   
   # Install client dependencies
   cd ../client
   npm install
   ```

4. **Start MongoDB**
   ```bash
   mongod
   ```

5. **Start MERN Server**
   ```bash
   cd server
   npm start
   ```

6. **Start React Client**
   ```bash
   cd client
   npm start
   ```

### Environment Variables

Create `.env` files in both `server/` and `client/` directories:

**Server Environment (`server/.env`)**
```env
MONGODB_URI=mongodb://localhost:27017/gymbuddy
JWT_SECRET=your_jwt_secret_here
CLIENT_URL=http://localhost:3000
PYTHON_BACKEND_URL=http://localhost:8000
```

**Client Environment (`client/.env`)**
```env
REACT_APP_API_URL=http://localhost:5000
```

## 📦 Dependencies

### AI Backend (Python)
- **OpenCV**: Computer vision and image processing
- **MediaPipe**: Pose detection and tracking
- **Flask**: Web framework for AI endpoints
- **NumPy**: Numerical computations
- **Pillow**: Image processing

### MERN Stack
- **React**: Frontend framework
- **Node.js/Express**: Backend API
- **MongoDB**: Database
- **JWT**: Authentication
- **Axios**: HTTP client

### Additional Tools
- **MongoDB**: Database server
- **npm**: Package manager
- **Python 3.8+**: Required for AI backend

## 🧪 Testing

The project includes test files for both account management and core functionality:
- `test_account.py`: Tests user account operations
- `test_functionality.py`: Tests core application features

### AI Integration Testing
- Test AI backend health: `http://localhost:8000/health`
- Test real-time analysis: Use the AI workout session feature
- Test form analysis: Upload exercise videos/images

## 📱 Usage

### AI Workout Session
1. Navigate to `/ai-workout` in the application
2. Select your exercise type (push-up, pull-up, sit-up, squat, walk)
3. Click "Start Workout" to begin camera access
4. Position yourself in front of the camera
5. Perform your exercise - the AI will count reps and provide feedback
6. Click "End Workout" when finished

### Exercise Form Analysis
1. Navigate to the form analysis section
2. Select exercise type
3. Upload a video or image of your exercise
4. Click "Analyze Form" to get AI feedback
5. Review results including rep count and form quality

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📚 Additional Documentation

- [AI Integration Guide](AI_INTEGRATION_README.md) - Detailed guide for the AI fitness trainer integration
- AI-powered pose detection and exercise analysis

## License

This project is licensed under the MIT License - see the LICENSE file for details. 