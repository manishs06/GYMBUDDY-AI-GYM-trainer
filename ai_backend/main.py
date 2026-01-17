import cv2
import numpy as np
import mediapipe as mp
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

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from body_part_angle import BodyPartAngle
from types_of_exercise import TypeOfExercise
from utils import *

app = Flask(__name__)
CORS(app)

# Initialize MediaPipe
mp_pose = mp.solutions.pose
mp_drawing = mp.solutions.drawing_utils
mp_drawing_styles = mp.solutions.drawing_styles

class AIFitnessTrainer:
    def __init__(self, mp_model):
        self.pose = mp_model
        self.body_part_angle = BodyPartAngle()
        # Session storage: sessionId -> { 'exercise': TypeOfExercise, 'last_seen': timestamp }
        self.sessions = {}
        self.session_timeout = 600 # 10 minutes

    def get_session(self, session_id):
        """Retrieve or create a session-specific exercise state"""
        now = time.time()
        
        # Cleanup old sessions occasionally
        if len(self.sessions) > 100:
            self.cleanup_sessions()

        if session_id not in self.sessions:
            self.sessions[session_id] = {
                'exercise': TypeOfExercise(),
                'last_seen': now
            }
        else:
            self.sessions[session_id]['last_seen'] = now
            
        return self.sessions[session_id]['exercise']

    def cleanup_sessions(self):
        """Remove sessions that haven't been active for a while"""
        now = time.time()
        to_delete = [sid for sid, data in self.sessions.items() 
                     if now - data['last_seen'] > self.session_timeout]
        for sid in to_delete:
            del self.sessions[sid]
        
    def calculate_angle(self, a, b, c):
        """Calculate angle between three points"""
        a = np.array([a.x, a.y])
        b = np.array([b.x, b.y])
        c = np.array([c.x, c.y])
        
        radians = np.arctan2(c[1] - b[1], c[0] - b[0]) - np.arctan2(a[1] - b[1], a[0] - b[0])
        angle = np.abs(radians * 180.0 / np.pi)
        
        if angle > 180.0:
            angle = 360 - angle
            
        return angle
    
    def analyze_frame(self, frame, exercise_type, session_id="default"):
        """Analyze a single frame for exercise detection"""
        if frame is None:
            return None
            
        exercise_state = self.get_session(session_id)
            
        # Convert BGR to RGB
        image = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        image.flags.writeable = False
        
        # Make detection
        results = self.pose.process(image)
        
        # Recolor back to BGR
        image.flags.writeable = True
        image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)
        
        # Extract landmarks
        if not results.pose_landmarks:
            return {
                'count': exercise_state.counter,
                'status': 'no_person',
                'feedback': 'No person detected in frame',
                'calories': exercise_state.calories,
                'angles': {},
                'landmarks': []
            }

        try:
            landmarks = results.pose_landmarks.landmark
            
            # Get coordinates
            left_shoulder = [landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER.value].x, landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER.value].y]
            left_elbow = [landmarks[mp_pose.PoseLandmark.LEFT_ELBOW.value].x, landmarks[mp_pose.PoseLandmark.LEFT_ELBOW.value].y]
            left_wrist = [landmarks[mp_pose.PoseLandmark.LEFT_WRIST.value].x, landmarks[mp_pose.PoseLandmark.LEFT_WRIST.value].y]
            
            right_shoulder = [landmarks[mp_pose.PoseLandmark.RIGHT_SHOULDER.value].x, landmarks[mp_pose.PoseLandmark.RIGHT_SHOULDER.value].y]
            right_elbow = [landmarks[mp_pose.PoseLandmark.RIGHT_ELBOW.value].x, landmarks[mp_pose.PoseLandmark.RIGHT_ELBOW.value].y]
            right_wrist = [landmarks[mp_pose.PoseLandmark.RIGHT_WRIST.value].x, landmarks[mp_pose.PoseLandmark.RIGHT_WRIST.value].y]
            
            left_hip = [landmarks[mp_pose.PoseLandmark.LEFT_HIP.value].x, landmarks[mp_pose.PoseLandmark.LEFT_HIP.value].y]
            left_knee = [landmarks[mp_pose.PoseLandmark.LEFT_KNEE.value].x, landmarks[mp_pose.PoseLandmark.LEFT_KNEE.value].y]
            left_ankle = [landmarks[mp_pose.PoseLandmark.LEFT_ANKLE.value].x, landmarks[mp_pose.PoseLandmark.LEFT_ANKLE.value].y]
            
            right_hip = [landmarks[mp_pose.PoseLandmark.RIGHT_HIP.value].x, landmarks[mp_pose.PoseLandmark.RIGHT_HIP.value].y]
            right_knee = [landmarks[mp_pose.PoseLandmark.RIGHT_KNEE.value].x, landmarks[mp_pose.PoseLandmark.RIGHT_KNEE.value].y]
            right_ankle = [landmarks[mp_pose.PoseLandmark.RIGHT_ANKLE.value].x, landmarks[mp_pose.PoseLandmark.RIGHT_ANKLE.value].y]
            
            # Calculate angles
            left_arm_angle = self.body_part_angle.angle_of_the_left_arm(left_shoulder, left_elbow, left_wrist)
            right_arm_angle = self.body_part_angle.angle_of_the_right_arm(right_shoulder, right_elbow, right_wrist)
            left_leg_angle = self.body_part_angle.angle_of_the_left_leg(left_hip, left_knee, left_ankle)
            right_leg_angle = self.body_part_angle.angle_of_the_right_leg(right_hip, right_knee, right_ankle)
            left_shoulder_angle = self.body_part_angle.angle_of_the_abdomen(left_shoulder, left_hip, left_knee)
            right_shoulder_angle = self.body_part_angle.angle_of_the_abdomen(right_shoulder, right_hip, right_knee)
            
            # Exercise detection based on type
            if exercise_type == "push-up":
                count, status, feedback, calories = exercise_state.push_up(left_arm_angle, right_arm_angle, left_shoulder_angle, right_shoulder_angle)
            elif exercise_type == "pull-up":
                count, status, feedback, calories = exercise_state.pull_up(left_arm_angle, right_arm_angle, left_shoulder_angle, right_shoulder_angle)
            elif exercise_type == "sit-up":
                count, status, feedback, calories = exercise_state.sit_up(left_shoulder_angle, right_shoulder_angle)
            elif exercise_type == "squat":
                count, status, feedback, calories = exercise_state.squat(left_leg_angle, right_leg_angle)
            elif exercise_type == "walk":
                count, status, feedback, calories = exercise_state.walk(left_leg_angle, right_leg_angle)
            else:
                count, status, feedback, calories = 0, "unknown", "Exercise type not supported", 0.0
            
            # Extract all 33 raw landmarks for client-side drawing
            raw_landmarks = []
            for lm in landmarks:
                raw_landmarks.append({
                    'x': lm.x,
                    'y': lm.y,
                    'z': lm.z,
                    'visibility': lm.visibility
                })

            return {
                'count': count,
                'status': status,
                'feedback': feedback,
                'calories': calories,
                'angles': {
                    'left_arm': left_arm_angle,
                    'right_arm': right_arm_angle,
                    'left_leg': left_leg_angle,
                    'right_leg': right_leg_angle,
                    'left_shoulder': left_shoulder_angle,
                    'right_shoulder': right_shoulder_angle
                },
                'landmarks': raw_landmarks
            }
            
        except Exception as e:
            return {
                'count': 0,
                'status': 'error',
                'feedback': f'Error analyzing pose: {str(e)}',
                'calories': 0.0,
                'angles': {},
                'landmarks': []
            }

# Shared MediaPipe model to save memory - Complexity 0 is "Lite" (fastest)
pose_model = mp_pose.Pose(
    static_image_mode=False,
    model_complexity=0,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5
)

# Initialize the AI trainer
ai_trainer = AIFitnessTrainer(pose_model)

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'AI Fitness Trainer',
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
        session_id = request.form.get('sessionId', f"upload_{int(time.time())}")
        
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
                    
                result = ai_trainer.analyze_frame(frame, exercise_type, session_id)
                if result:
                    results.append(result)
            
            cap.release()
            os.remove(temp_path)
            
            # Calculate summary
            total_count = max([r['count'] for r in results]) if results else 0
            total_calories = max([r['calories'] for r in results]) if results else 0.0
            final_status = results[-1]['status'] if results else 'unknown'
            feedback = results[-1]['feedback'] if results else 'No analysis available'
            
        else:
            # Handle image file
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            result = ai_trainer.analyze_frame(image, exercise_type, session_id)
            
            if result:
                results = [result]
                total_count = result['count']
                total_calories = result['calories']
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
            'total_calories': total_calories,
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
        session_id = request.form.get('sessionId', 'default')
        
        # Read the frame
        file_bytes = file.read()
        nparr = np.frombuffer(file_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        # Analyze the frame
        result = ai_trainer.analyze_frame(frame, exercise_type, session_id)
        
        if result:
            return jsonify({
                'success': True,
                'exercise_type': exercise_type,
                'count': result['count'],
                'calories': result['calories'],
                'status': result['status'],
                'feedback': result['feedback'],
                'angles': result['angles'],
                'landmarks': result['landmarks'],
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

@app.route('/api/nutrition-plan', methods=['POST'])
def generate_nutrition_plan():
    """Generate personalized nutrition plan based on biometrics"""
    try:
        data = request.get_json()
        weight = data.get('weight') # kg
        height = data.get('height') # cm
        age = data.get('age')
        gender = data.get('gender')
        activity_level = data.get('activity_level', 'moderate')
        goals = data.get('goals', [])
        
        if not all([weight, height, age, gender]):
             return jsonify({
                'success': False,
                'message': 'Missing biometric data',
                'nutrition_plan': None
            })

        # Calculate BMR (Mifflin-St Jeor Equation)
        if gender == 'male':
            bmr = 10 * weight + 6.25 * height - 5 * age + 5
        else:
            bmr = 10 * weight + 6.25 * height - 5 * age - 161
            
        # Activity Multipliers
        multipliers = {
            'sedentary': 1.2,
            'light': 1.375,
            'moderate': 1.55,
            'active': 1.725,
            'very_active': 1.9
        }
        
        tdee = bmr * multipliers.get(activity_level, 1.55)
        
        # Adjust for goals
        target_calories = tdee
        if 'weight_loss' in goals:
            target_calories -= 500
        elif 'muscle_gain' in goals:
            target_calories += 300
            
        # Macro split (simplified)
        macros = {
            'protein': int(target_calories * 0.3 / 4), # 30% protein
            'carbs': int(target_calories * 0.4 / 4),   # 40% carbs
            'fats': int(target_calories * 0.3 / 9)     # 30% fats
        }
        
        nutrition_plan = {
            'daily_calories': int(target_calories),
            'bmr': int(bmr),
            'tdee': int(tdee),
            'macros': macros,
            'hydration_target': round(weight * 0.033, 1), # ~33ml per kg
            'suggestions': []
        }
        
        if 'weight_loss' in goals:
             nutrition_plan['suggestions'].append("Focus on high-fiber foods and lean proteins.")
             nutrition_plan['suggestions'].append("Drink water before meals to manage appetite.")
        if 'muscle_gain' in goals:
             nutrition_plan['suggestions'].append("Ensure protein intake with every meal.")
             nutrition_plan['suggestions'].append("Consume complex carbs pre-workout for energy.")
             
        return jsonify({
            'success': True,
            'nutrition_plan': nutrition_plan,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        return jsonify({
            'error': f'Failed to generate nutrition plan: {str(e)}',
            'timestamp': datetime.now().isoformat()
        }), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000, debug=True) 