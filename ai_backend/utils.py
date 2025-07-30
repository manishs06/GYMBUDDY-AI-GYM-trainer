import cv2
import numpy as np
import mediapipe as mp
from datetime import datetime
import json
import os

def draw_landmarks(image, landmarks):
    """Draw pose landmarks on the image"""
    mp_pose = mp.solutions.pose
    mp_drawing = mp.solutions.drawing_utils
    mp_drawing_styles = mp.solutions.drawing_styles
    
    mp_drawing.draw_landmarks(
        image,
        landmarks,
        mp_pose.POSE_CONNECTIONS,
        landmark_drawing_spec=mp_drawing_styles.get_default_pose_landmarks_style()
    )
    
    return image

def add_text_overlay(image, text, position=(10, 30), font_scale=1, color=(255, 255, 255), thickness=2):
    """Add text overlay to the image"""
    cv2.putText(image, text, position, cv2.FONT_HERSHEY_SIMPLEX, font_scale, color, thickness)
    return image

def calculate_angle(a, b, c):
    """Calculate angle between three points"""
    a = np.array([a[0], a[1]])
    b = np.array([b[0], b[1]])
    c = np.array([c[0], c[1]])
    
    radians = np.arctan2(c[1] - b[1], c[0] - b[0]) - np.arctan2(a[1] - b[1], a[0] - b[0])
    angle = np.abs(radians * 180.0 / np.pi)
    
    if angle > 180.0:
        angle = 360 - angle
        
    return angle

def get_landmark_coordinates(landmarks, landmark_idx):
    """Get coordinates of a specific landmark"""
    try:
        landmark = landmarks[landmark_idx]
        return [landmark.x, landmark.y]
    except:
        return [0, 0]

def save_analysis_result(result, filename=None):
    """Save analysis result to JSON file"""
    if filename is None:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"analysis_result_{timestamp}.json"
    
    # Create output directory if it doesn't exist
    os.makedirs("output", exist_ok=True)
    
    filepath = os.path.join("output", filename)
    
    with open(filepath, 'w') as f:
        json.dump(result, f, indent=2, default=str)
    
    return filepath

def create_video_writer(filename, fps=30, frame_size=(640, 480)):
    """Create video writer for saving processed video"""
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(filename, fourcc, fps, frame_size)
    return out

def resize_frame(frame, width=640, height=480):
    """Resize frame to specified dimensions"""
    return cv2.resize(frame, (width, height))

def convert_to_rgb(frame):
    """Convert BGR frame to RGB"""
    return cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

def convert_to_bgr(frame):
    """Convert RGB frame to BGR"""
    return cv2.cvtColor(frame, cv2.COLOR_RGB2BGR)

def get_exercise_instructions(exercise_type):
    """Get instructions for specific exercise type"""
    instructions = {
        "push-up": {
            "title": "Push-Up",
            "description": "A conditioning exercise performed in a prone position by raising and lowering the body with the straightening and bending of the arms.",
            "steps": [
                "Start in a plank position with hands slightly wider than shoulders",
                "Lower your body until your chest nearly touches the floor",
                "Push your body back up to the starting position",
                "Keep your body in a straight line throughout the movement"
            ],
            "tips": [
                "Keep your core engaged",
                "Don't let your hips sag",
                "Breathe steadily throughout the movement"
            ]
        },
        "pull-up": {
            "title": "Pull-Up",
            "description": "An upper-body strength exercise where the body is suspended by the hands and pulls up.",
            "steps": [
                "Grab the pull-up bar with hands slightly wider than shoulders",
                "Hang with arms fully extended",
                "Pull your body up until your chin is over the bar",
                "Lower yourself back down with control"
            ],
            "tips": [
                "Engage your back muscles",
                "Avoid swinging or using momentum",
                "Keep your core tight"
            ]
        },
        "sit-up": {
            "title": "Sit-Up",
            "description": "An abdominal endurance training exercise to strengthen and tone the abdominal muscles.",
            "steps": [
                "Lie on your back with knees bent and feet flat",
                "Place your hands behind your head or across your chest",
                "Lift your upper body toward your knees",
                "Lower back down with control"
            ],
            "tips": [
                "Keep your feet flat on the ground",
                "Don't pull on your neck",
                "Use your abs, not momentum"
            ]
        },
        "squat": {
            "title": "Squat",
            "description": "A strength exercise in which the trainee lowers their hips from a standing position and then stands back up.",
            "steps": [
                "Stand with feet shoulder-width apart",
                "Lower your hips back and down as if sitting in a chair",
                "Keep your chest up and knees behind your toes",
                "Stand back up to the starting position"
            ],
            "tips": [
                "Keep your weight in your heels",
                "Don't let your knees cave inward",
                "Go as low as you can while maintaining good form"
            ]
        },
        "walk": {
            "title": "Walking",
            "description": "A low-impact cardiovascular exercise that improves fitness and health.",
            "steps": [
                "Stand tall with good posture",
                "Take natural steps with your feet",
                "Swing your arms naturally",
                "Maintain a steady pace"
            ],
            "tips": [
                "Keep your head up and look ahead",
                "Relax your shoulders",
                "Breathe naturally"
            ]
        }
    }
    
    return instructions.get(exercise_type, {
        "title": "Unknown Exercise",
        "description": "Exercise type not recognized.",
        "steps": [],
        "tips": []
    }) 