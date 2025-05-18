import os
import requests
from PIL import Image
from io import BytesIO

def download_image(url, filename):
    try:
        response = requests.get(url)
        if response.status_code == 200:
            img = Image.open(BytesIO(response.content))
            img.save(filename)
            print(f"Downloaded {filename}")
        else:
            print(f"Failed to download {filename}")
    except Exception as e:
        print(f"Error downloading {filename}: {str(e)}")

def main():
    # Create directories if they don't exist
    os.makedirs('static/images', exist_ok=True)

    # Sample images for exercises
    exercise_images = {
        'bench-press.jpg': 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b',
        'curl.jpg': 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e',
        'squat.jpg': 'https://images.unsplash.com/photo-1574680096145-d05b474e2155'
    }

    # Sample avatar images
    avatar_images = {
        'avatar1.jpg': 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde',
        'avatar2.jpg': 'https://images.unsplash.com/photo-1494790108377-be9c29b29330',
        'avatar3.jpg': 'https://images.unsplash.com/photo-1599566150163-29194dcaad36'
    }

    # Download exercise images
    for filename, url in exercise_images.items():
        download_image(url, os.path.join('static/images', filename))

    # Download avatar images
    for filename, url in avatar_images.items():
        download_image(url, os.path.join('static/images', filename))

if __name__ == '__main__':
    main() 