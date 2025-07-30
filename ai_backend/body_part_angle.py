import math
import numpy as np

class BodyPartAngle:
    def __init__(self):
        pass
    
    def angle_of_the_left_arm(self, left_shoulder, left_elbow, left_wrist):
        """Calculate the angle of the left arm"""
        try:
            angle = self.calculate_angle(left_shoulder, left_elbow, left_wrist)
            return angle
        except:
            return 0
    
    def angle_of_the_right_arm(self, right_shoulder, right_elbow, right_wrist):
        """Calculate the angle of the right arm"""
        try:
            angle = self.calculate_angle(right_shoulder, right_elbow, right_wrist)
            return angle
        except:
            return 0
    
    def angle_of_the_left_leg(self, left_hip, left_knee, left_ankle):
        """Calculate the angle of the left leg"""
        try:
            angle = self.calculate_angle(left_hip, left_knee, left_ankle)
            return angle
        except:
            return 0
    
    def angle_of_the_right_leg(self, right_hip, right_knee, right_ankle):
        """Calculate the angle of the right leg"""
        try:
            angle = self.calculate_angle(right_hip, right_knee, right_ankle)
            return angle
        except:
            return 0
    
    def angle_of_the_abdomen(self, shoulder, hip, knee):
        """Calculate the angle of the abdomen (shoulder to hip to knee)"""
        try:
            angle = self.calculate_angle(shoulder, hip, knee)
            return angle
        except:
            return 0
    
    def calculate_angle(self, a, b, c):
        """Calculate angle between three points"""
        a = np.array([a[0], a[1]])
        b = np.array([b[0], b[1]])
        c = np.array([c[0], c[1]])
        
        radians = np.arctan2(c[1] - b[1], c[0] - b[0]) - np.arctan2(a[1] - b[1], a[0] - b[0])
        angle = np.abs(radians * 180.0 / np.pi)
        
        if angle > 180.0:
            angle = 360 - angle
            
        return angle 