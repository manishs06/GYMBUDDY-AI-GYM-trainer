from app import app, db, User
from werkzeug.security import generate_password_hash

def create_test_account():
    with app.app_context():
        # Create test user
        test_user = User(
            username='testuser',
            email='test@example.com'
        )
        test_user.set_password('Test@123')
        
        # Add to database
        db.session.add(test_user)
        db.session.commit()
        
        print("Test account created successfully!")
        print("Username: testuser")
        print("Email: test@example.com")
        print("Password: Test@123")

if __name__ == '__main__':
    create_test_account() 