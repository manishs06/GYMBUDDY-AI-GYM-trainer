import cv2
import numpy as np
import math
import argparse
import os
import sys
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import base64
import io
from PIL import Image
import json
import time
from datetime import datetime

app = Flask(__name__)
CORS(app)

class SimpleAIFitnessTrainer:
    def __init__(self):
        self.count = 0
        self.status = 'starting'
        self.feedback = []
        
    def analyze_frame(self, frame, exercise_type):
        """Simple frame analysis without MediaPipe"""
        if frame is None:
            return None
            
        # Convert BGR to RGB
        image = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        
        # Simple mock analysis for testing
        # In a real implementation, this would use MediaPipe for pose detection
        
        # Mock angles (in a real implementation, these would be calculated from pose landmarks)
        mock_angles = {
            'left_arm': 90 + (self.count * 10) % 60,
            'right_arm': 90 + (self.count * 10) % 60,
            'left_leg': 120 + (self.count * 5) % 40,
            'right_leg': 120 + (self.count * 5) % 40,
            'left_shoulder': 180 + (self.count * 3) % 20,
            'right_shoulder': 180 + (self.count * 3) % 20
        }
        
        # Simple exercise detection logic
        if exercise_type == "push-up":
            if mock_angles['left_arm'] < 100:
                self.count += 1
                status = "down"
                feedback = "Good form! Keep going."
            else:
                status = "up"
                feedback = "Ready for next rep."
        elif exercise_type == "squat":
            if mock_angles['left_leg'] < 130:
                self.count += 1
                status = "down"
                feedback = "Good depth! Push up."
            else:
                status = "up"
                feedback = "Ready to squat."
        else:
            status = "unknown"
            feedback = "Exercise type not supported in demo mode."
        
        # Draw a simple overlay on the image
        image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)
        cv2.putText(image, f'Count: {self.count}', (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
        cv2.putText(image, f'Status: {status}', (10, 70), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
        cv2.putText(image, f'Exercise: {exercise_type}', (10, 110), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
        
        return {
            'count': self.count,
            'status': status,
            'feedback': feedback,
            'angles': mock_angles,
            'landmarks': {}
        }

# Initialize the AI trainer
ai_trainer = SimpleAIFitnessTrainer()

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'AI Fitness Trainer (Demo Mode)',
        'timestamp': datetime.now().isoformat()
    })

@app.route('/api/analyze-form', methods=['POST'])
def analyze_form():
    """Analyze exercise form from uploaded media"""
    try:
        if 'media' not in request.files:
            return jsonify({'error': 'No media file provided'}), 400
            
        file = request.files['media']
        exercise_type = request.form.get('exerciseName', 'push-up')
        
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
            
        # Read the video/image file
        file_bytes = file.read()
        
        # Convert to numpy array
        nparr = np.frombuffer(file_bytes, np.uint8)
        
        if file.content_type.startswith('video/'):
            # Handle video file
            temp_path = f'temp_{int(time.time())}.mp4'
            with open(temp_path, 'wb') as f:
                f.write(file_bytes)
            
            cap = cv2.VideoCapture(temp_path)
            results = []
            
            while cap.isOpened():
                ret, frame = cap.read()
                if not ret:
                    break
                    
                result = ai_trainer.analyze_frame(frame, exercise_type)
                if result:
                    results.append(result)
            
            cap.release()
            os.remove(temp_path)
            
            # Calculate summary
            total_count = max([r['count'] for r in results]) if results else 0
            final_status = results[-1]['status'] if results else 'unknown'
            feedback = results[-1]['feedback'] if results else 'No analysis available'
            
        else:
            # Handle image file
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            result = ai_trainer.analyze_frame(image, exercise_type)
            
            if result:
                results = [result]
                total_count = result['count']
                final_status = result['status']
                feedback = result['feedback']
            else:
                results = []
                total_count = 0
                final_status = 'error'
                feedback = 'Could not analyze image'
        
        return jsonify({
            'success': True,
            'exercise_type': exercise_type,
            'total_count': total_count,
            'status': final_status,
            'feedback': feedback,
            'frame_analysis': results,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        return jsonify({
            'error': f'Analysis failed: {str(e)}',
            'timestamp': datetime.now().isoformat()
        }), 500

@app.route('/api/real-time-analysis', methods=['POST'])
def real_time_analysis():
    """Real-time exercise analysis for live workouts"""
    try:
        if 'frame' not in request.files:
            return jsonify({'error': 'No frame provided'}), 400
            
        file = request.files['frame']
        exercise_type = request.form.get('exerciseType', 'push-up')
        
        # Read the frame
        file_bytes = file.read()
        nparr = np.frombuffer(file_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        # Analyze the frame
        result = ai_trainer.analyze_frame(frame, exercise_type)
        
        if result:
            return jsonify({
                'success': True,
                'exercise_type': exercise_type,
                'count': result['count'],
                'status': result['status'],
                'feedback': result['feedback'],
                'angles': result['angles'],
                'timestamp': datetime.now().isoformat()
            })
        else:
            return jsonify({
                'error': 'Could not analyze frame',
                'timestamp': datetime.now().isoformat()
            }), 400
            
    except Exception as e:
        return jsonify({
            'error': f'Real-time analysis failed: {str(e)}',
            'timestamp': datetime.now().isoformat()
        }), 500

@app.route('/api/exercise-suggestions', methods=['GET'])
def exercise_suggestions():
    """Get AI-powered exercise suggestions"""
    try:
        fitness_level = request.args.get('fitnessLevel', 'beginner')
        goals = request.args.get('goals', '').split(',')
        recent_exercises = request.args.get('recentExercises', '').split(',')
        
        # Simple exercise suggestions based on fitness level and goals
        suggestions = {
            'beginner': {
                'strength': ['push-up', 'sit-up', 'squat'],
                'cardio': ['walk'],
                'flexibility': ['stretching']
            },
            'intermediate': {
                'strength': ['push-up', 'pull-up', 'squat'],
                'cardio': ['walk', 'jogging'],
                'flexibility': ['stretching', 'yoga']
            },
            'advanced': {
                'strength': ['push-up', 'pull-up', 'squat', 'burpees'],
                'cardio': ['walk', 'jogging', 'running'],
                'flexibility': ['stretching', 'yoga', 'pilates']
            }
        }
        
        level_suggestions = suggestions.get(fitness_level, suggestions['beginner'])
        
        # Filter based on goals
        recommended_exercises = []
        for goal in goals:
            if goal in level_suggestions:
                recommended_exercises.extend(level_suggestions[goal])
        
        # Remove duplicates
        recommended_exercises = list(set(recommended_exercises))
        
        return jsonify({
            'success': True,
            'fitness_level': fitness_level,
            'goals': goals,
            'recommended_exercises': recommended_exercises,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        return jsonify({
            'error': f'Failed to get exercise suggestions: {str(e)}',
            'timestamp': datetime.now().isoformat()
        }), 500

@app.route('/api/workout-plan', methods=['POST'])
def generate_workout_plan():
    """Generate personalized workout plan"""
    try:
        data = request.get_json()
        fitness_level = data.get('fitnessLevel', 'beginner')
        goals = data.get('goals', [])
        available_time = data.get('availableTime', 30)
        equipment = data.get('equipment', [])
        
        # Generate workout plan based on parameters
        workout_plan = {
            'warm_up': {
                'duration': 5,
                'exercises': ['light stretching', 'walking in place']
            },
            'main_workout': {
                'duration': available_time - 10,
                'exercises': []
            },
            'cool_down': {
                'duration': 5,
                'exercises': ['stretching', 'deep breathing']
            }
        }
        
        # Add exercises based on fitness level and goals
        if 'strength' in goals:
            if fitness_level == 'beginner':
                workout_plan['main_workout']['exercises'].extend(['push-up', 'sit-up', 'squat'])
            elif fitness_level == 'intermediate':
                workout_plan['main_workout']['exercises'].extend(['push-up', 'pull-up', 'squat'])
            else:
                workout_plan['main_workout']['exercises'].extend(['push-up', 'pull-up', 'squat', 'burpees'])
        
        if 'cardio' in goals:
            workout_plan['main_workout']['exercises'].extend(['walk', 'jogging'])
        
        return jsonify({
            'success': True,
            'workout_plan': workout_plan,
            'fitness_level': fitness_level,
            'goals': goals,
            'available_time': available_time,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        return jsonify({
            'error': f'Failed to generate workout plan: {str(e)}',
            'timestamp': datetime.now().isoformat()
        }), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True) 