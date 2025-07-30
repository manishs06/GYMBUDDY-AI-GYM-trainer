#!/usr/bin/env python3
"""
AI Fitness Trainer Startup Script
This script helps start all components of the AI Fitness Trainer application
"""

import os
import sys
import subprocess
import time
import signal
import threading
from pathlib import Path

class AIFitnessApp:
    def __init__(self):
        self.processes = []
        self.running = True
        
    def check_dependencies(self):
        """Check if required dependencies are installed"""
        print("🔍 Checking dependencies...")
        
        # Check Python dependencies
        try:
            import cv2
            import mediapipe
            import numpy
            import flask
            print("✅ Python dependencies are installed")
        except ImportError as e:
            print(f"❌ Missing Python dependency: {e}")
            print("Please run: pip install -r ai_backend/requirements.txt")
            return False
        
        # Check Node.js
        try:
            result = subprocess.run(['node', '--version'], capture_output=True, text=True)
            if result.returncode == 0:
                print(f"✅ Node.js is installed: {result.stdout.strip()}")
            else:
                print("❌ Node.js is not installed")
                return False
        except FileNotFoundError:
            print("❌ Node.js is not installed")
            return False
        
        # Check npm
        try:
            result = subprocess.run(['npm', '--version'], capture_output=True, text=True)
            if result.returncode == 0:
                print(f"✅ npm is installed: {result.stdout.strip()}")
            else:
                print("❌ npm is not installed")
                return False
        except FileNotFoundError:
            print("❌ npm is not installed")
            return False
        
        return True
    
    def install_dependencies(self):
        """Install project dependencies"""
        print("📦 Installing dependencies...")
        
        # Install server dependencies
        if os.path.exists("server/package.json"):
            print("Installing server dependencies...")
            subprocess.run(['npm', 'install'], cwd='server', check=True)
        
        # Install client dependencies
        if os.path.exists("client/package.json"):
            print("Installing client dependencies...")
            subprocess.run(['npm', 'install'], cwd='client', check=True)
        
        print("✅ Dependencies installed successfully")
    
    def start_ai_backend(self):
        """Start the AI backend server"""
        print("🤖 Starting AI backend...")
        
        if not os.path.exists("ai_backend/main.py"):
            print("❌ AI backend not found. Please ensure ai_backend/main.py exists")
            return None
        
        try:
            process = subprocess.Popen(
                [sys.executable, "main.py"],
                cwd="ai_backend",
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE
            )
            self.processes.append(("AI Backend", process))
            print("✅ AI backend started on http://localhost:8000")
            return process
        except Exception as e:
            print(f"❌ Failed to start AI backend: {e}")
            return None
    
    def start_server(self):
        """Start the MERN server"""
        print("🚀 Starting MERN server...")
        
        if not os.path.exists("server/package.json"):
            print("❌ Server not found. Please ensure server/package.json exists")
            return None
        
        try:
            process = subprocess.Popen(
                ['npm', 'start'],
                cwd='server',
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE
            )
            self.processes.append(("MERN Server", process))
            print("✅ MERN server started on http://localhost:5000")
            return process
        except Exception as e:
            print(f"❌ Failed to start MERN server: {e}")
            return None
    
    def start_client(self):
        """Start the React client"""
        print("⚛️ Starting React client...")
        
        if not os.path.exists("client/package.json"):
            print("❌ Client not found. Please ensure client/package.json exists")
            return None
        
        try:
            process = subprocess.Popen(
                ['npm', 'start'],
                cwd='client',
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE
            )
            self.processes.append(("React Client", process))
            print("✅ React client started on http://localhost:3000")
            return process
        except Exception as e:
            print(f"❌ Failed to start React client: {e}")
            return None
    
    def check_mongodb(self):
        """Check if MongoDB is running"""
        print("🗄️ Checking MongoDB...")
        
        try:
            result = subprocess.run(['mongod', '--version'], capture_output=True, text=True)
            if result.returncode == 0:
                print("✅ MongoDB is installed")
                
                # Try to connect to MongoDB
                try:
                    import pymongo
                    client = pymongo.MongoClient("mongodb://localhost:27017/", serverSelectionTimeoutMS=2000)
                    client.server_info()
                    print("✅ MongoDB is running")
                    return True
                except Exception:
                    print("⚠️ MongoDB is installed but not running")
                    print("Please start MongoDB with: mongod")
                    return False
            else:
                print("❌ MongoDB is not installed")
                return False
        except FileNotFoundError:
            print("❌ MongoDB is not installed")
            return False
    
    def create_env_files(self):
        """Create environment files if they don't exist"""
        print("📝 Creating environment files...")
        
        # Server .env
        server_env_path = Path("server/.env")
        if not server_env_path.exists():
            server_env_content = """MONGODB_URI=mongodb://localhost:27017/gymbuddy
JWT_SECRET=your_jwt_secret_here_change_in_production
CLIENT_URL=http://localhost:3000
PYTHON_BACKEND_URL=http://localhost:8000
PORT=5000
NODE_ENV=development"""
            
            with open(server_env_path, 'w') as f:
                f.write(server_env_content)
            print("✅ Created server/.env")
        
        # Client .env
        client_env_path = Path("client/.env")
        if not client_env_path.exists():
            client_env_content = """REACT_APP_API_URL=http://localhost:5000
REACT_APP_AI_BACKEND_URL=http://localhost:8000"""
            
            with open(client_env_path, 'w') as f:
                f.write(client_env_content)
            print("✅ Created client/.env")
    
    def start_all_services(self):
        """Start all services"""
        print("🎯 Starting AI Fitness Trainer Application...")
        
        # Check dependencies
        if not self.check_dependencies():
            print("❌ Dependency check failed. Please install missing dependencies.")
            return False
        
        # Create environment files
        self.create_env_files()
        
        # Check MongoDB
        if not self.check_mongodb():
            print("⚠️ MongoDB is not running. Some features may not work.")
        
        # Install dependencies if needed
        if not os.path.exists("server/node_modules") or not os.path.exists("client/node_modules"):
            self.install_dependencies()
        
        # Start services
        ai_process = self.start_ai_backend()
        server_process = self.start_server()
        client_process = self.start_client()
        
        if not all([ai_process, server_process, client_process]):
            print("❌ Failed to start all services")
            return False
        
        print("\n🎉 AI Fitness Trainer is starting up!")
        print("📱 React Client: http://localhost:3000")
        print("🚀 MERN Server: http://localhost:5000")
        print("🤖 AI Backend: http://localhost:8000")
        print("\n⏳ Waiting for services to be ready...")
        
        # Wait for services to be ready
        time.sleep(10)
        
        print("\n✅ All services are running!")
        print("🌐 Open http://localhost:3000 in your browser")
        print("📊 AI Health Check: http://localhost:8000/health")
        print("\nPress Ctrl+C to stop all services")
        
        return True
    
    def stop_all_services(self):
        """Stop all running services"""
        print("\n🛑 Stopping all services...")
        
        for name, process in self.processes:
            try:
                print(f"Stopping {name}...")
                process.terminate()
                process.wait(timeout=5)
                print(f"✅ {name} stopped")
            except subprocess.TimeoutExpired:
                print(f"⚠️ Force killing {name}")
                process.kill()
            except Exception as e:
                print(f"❌ Error stopping {name}: {e}")
        
        self.processes.clear()
        print("✅ All services stopped")
    
    def signal_handler(self, signum, frame):
        """Handle Ctrl+C signal"""
        print("\n🛑 Received interrupt signal")
        self.running = False
        self.stop_all_services()
        sys.exit(0)
    
    def run(self):
        """Main run method"""
        # Set up signal handler
        signal.signal(signal.SIGINT, self.signal_handler)
        
        try:
            if self.start_all_services():
                # Keep the script running
                while self.running:
                    time.sleep(1)
        except KeyboardInterrupt:
            print("\n🛑 Interrupted by user")
        finally:
            self.stop_all_services()

def main():
    """Main function"""
    print("🏋️ AI Fitness Trainer Startup Script")
    print("=" * 50)
    
    app = AIFitnessApp()
    app.run()

if __name__ == "__main__":
    main() 