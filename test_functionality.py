from app import app, db, User, Session
from datetime import datetime
import requests
import json

def test_functionality():
    with app.app_context():
        # 1. Verify test user exists
        user = User.query.filter_by(email='test@example.com').first()
        if not user:
            print("❌ Test user not found!")
            return
        print("✅ Test user found!")

        # 2. Create a test session
        session = Session(
            user_id=user.id,
            exercise_type='pushup',
            start_time=datetime.utcnow(),
            reps=10,
            quality_score=0.85
        )
        db.session.add(session)
        db.session.commit()
        print("✅ Test session created!")

        # 3. Verify user data
        print("\nUser Details:")
        print(f"Username: {user.username}")
        print(f"Email: {user.email}")
        print(f"Login attempts: {user.login_attempts}")
        print(f"Last attempt time: {user.last_attempt_time}")

        # 4. Verify sessions
        sessions = Session.query.filter_by(user_id=user.id).all()
        print("\nUser Sessions:")
        for s in sessions:
            print(f"Exercise: {s.exercise_type}")
            print(f"Reps: {s.reps}")
            print(f"Quality Score: {s.quality_score}")
            print(f"Start Time: {s.start_time}")
            print(f"End Time: {s.end_time}")
            print("---")

        # 5. Check database tables
        print("\nDatabase Tables:")
        for table in db.metadata.tables.keys():
            print(f"- {table}")

if __name__ == '__main__':
    test_functionality() 