class TypeOfExercise:
    def __init__(self):
        self.counter = 0
        self.calories = 0.0
        self.stage = None
        self.feedback = ""
        
    def push_up(self, left_arm_angle, right_arm_angle, left_shoulder_angle, right_shoulder_angle):
        """Detect push-up exercise"""
        # Average arm angles
        arm_angle = (left_arm_angle + right_arm_angle) / 2
        shoulder_angle = (left_shoulder_angle + right_shoulder_angle) / 2
        
        # Push-up detection logic
        if arm_angle < 90 and shoulder_angle > 160:
            self.stage = "down"
            self.feedback = "Great depth! Push back up."
        elif arm_angle > 160 and shoulder_angle > 160:
            if self.stage == "down":
                self.counter += 1
                self.calories += 0.5  # Approx calories per push-up
                self.stage = "up"
                self.feedback = "Good push-up! Keep your form."
            else:
                self.feedback = "Start in a plank position."
        else:
            self.feedback = "Maintain proper form - keep your body aligned."
            
        return self.counter, self.stage, self.feedback, self.calories
    
    def pull_up(self, left_arm_angle, right_arm_angle, left_shoulder_angle, right_shoulder_angle):
        """Detect pull-up exercise"""
        # Average arm angles
        arm_angle = (left_arm_angle + right_arm_angle) / 2
        shoulder_angle = (left_shoulder_angle + right_shoulder_angle) / 2
        
        # Pull-up detection logic
        if arm_angle < 90 and shoulder_angle > 160:
            self.stage = "up"
            self.feedback = "Excellent! Chin over the bar."
        elif arm_angle > 160 and shoulder_angle > 160:
            if self.stage == "up":
                self.counter += 1
                self.calories += 1.0  # Approx calories per pull-up
                self.stage = "down"
                self.feedback = "Perfect pull-up! Full range of motion."
            else:
                self.feedback = "Hang freely to start."
        else:
            self.feedback = "Keep your core engaged and body straight."
            
        return self.counter, self.stage, self.feedback, self.calories
    
    def sit_up(self, left_shoulder_angle, right_shoulder_angle):
        """Detect sit-up exercise"""
        # Average shoulder angle
        shoulder_angle = (left_shoulder_angle + right_shoulder_angle) / 2
        
        # Sit-up detection logic
        if shoulder_angle < 90:
            self.stage = "up"
            self.feedback = "Good! Keep your core engaged."
        elif shoulder_angle > 160:
            if self.stage == "up":
                self.counter += 1
                self.calories += 0.4  # Approx calories per sit-up
                self.stage = "down"
                self.feedback = "Great sit-up! Full range of motion."
            else:
                self.feedback = "Lower your upper body completely."
        else:
            self.feedback = "Keep your feet flat and avoid using momentum."
            
        return self.counter, self.stage, self.feedback, self.calories
    
    def squat(self, left_leg_angle, right_leg_angle):
        """Detect squat exercise"""
        # Average leg angle
        leg_angle = (left_leg_angle + right_leg_angle) / 2
        
        # Squat detection logic
        if leg_angle < 90:
            self.stage = "down"
            self.feedback = "Good depth! Keep your knees aligned."
        elif leg_angle > 160:
            if self.stage == "down":
                self.counter += 1
                self.calories += 0.6  # Approx calories per squat
                self.stage = "up"
                self.feedback = "Excellent squat! Full range of motion."
            else:
                self.feedback = "Stand up completely for a full rep."
        else:
            self.feedback = "Keep your chest up and weight in your heels."
            
        return self.counter, self.stage, self.feedback, self.calories
    
    def walk(self, left_leg_angle, right_leg_angle):
        """Detect walking exercise"""
        # Average leg angle
        leg_angle = (left_leg_angle + right_leg_angle) / 2
        
        # Walking detection logic (simplified)
        if leg_angle < 120:
            if self.stage != "step":
                self.counter += 1
                self.calories += 0.05  # Approx calories per step
                self.stage = "step"
                self.feedback = "Good walking form! Keep your posture upright."
            else:
                self.feedback = "Continue walking with good posture."
        else:
            self.stage = "stand"
            self.feedback = "Maintain good posture while walking."
            
        return self.counter, self.stage, self.feedback, self.calories 