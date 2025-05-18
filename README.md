# FormXpert - Fitness Form Tracking Application

FormXpert is a web-based application designed to help users track and improve their exercise form through session tracking, progress monitoring, and form analysis.

## Features

- User authentication and account management
- Exercise session tracking with detailed metrics
- Form quality scoring system
- Progress tracking and history
- Image processing capabilities for form analysis
- Database storage for user data and exercise sessions

## Project Structure

```
FormXpert/
├── modules/          # Core application modules
├── templates/        # HTML templates
├── static/          # Static files (CSS, JS, images)
├── instance/        # Instance-specific files
├── logs/           # Application logs
├── venv/           # Python virtual environment
├── test_account.py # Account testing utilities
├── test_functionality.py # Core functionality tests
├── download_images.py # Image processing utilities
├── requirements.txt # Python dependencies
└── fitness.db      # SQLite database
```

## Setup Instructions

1. Clone the repository
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Initialize the database:
   ```bash
   flask db init
   flask db migrate
   flask db upgrade
   ```
5. Run the application:
   ```bash
   flask run
   ```

## Dependencies

The project uses several key Python packages:
- Flask for the web framework
- SQLAlchemy for database management
- Other dependencies are listed in `requirements.txt`

## Testing

The project includes test files for both account management and core functionality:
- `test_account.py`: Tests user account operations
- `test_functionality.py`: Tests core application features

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 