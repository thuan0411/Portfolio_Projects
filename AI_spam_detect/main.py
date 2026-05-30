#!/usr/bin/env python3
"""
Main entry point for ShieldMail Application
Starts both backend (FastAPI) and frontend (React) servers
"""

import os
import sys
import subprocess
import signal
import time
from pathlib import Path
from threading import Thread

# Get the directory where this script is located
SCRIPT_DIR = Path(__file__).parent
BACKEND_DIR = SCRIPT_DIR / "backend"
FRONTEND_DIR = SCRIPT_DIR / "frontend"

# Global process references for cleanup
backend_process = None
frontend_process = None


def install_frontend_dependencies():
    """Automatically install frontend dependencies if node_modules is missing"""
    if (FRONTEND_DIR / "node_modules").exists():
        return True
    
    print("Frontend dependencies not found. Installing automatically...")
    print("=" * 60)
    
    # Determine npm command (npm or npm.cmd on Windows)
    npm_cmd = "npm.cmd" if sys.platform == "win32" else "npm"
    
    # Change to frontend directory
    original_dir = os.getcwd()
    try:
        os.chdir(FRONTEND_DIR)
        
        # Run npm install
        print(f"Running: {npm_cmd} install")
        result = subprocess.run(
            [npm_cmd, "install"],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            timeout=300  # 5 minute timeout
        )
        
        os.chdir(original_dir)
        
        if result.returncode != 0:
            print("ERROR: Failed to install frontend dependencies")
            print(result.stdout)
            return False
        
        print("Frontend dependencies installed successfully")
        print("=" * 60)
        return True
        
    except subprocess.TimeoutExpired:
        os.chdir(original_dir)
        print("ERROR: npm install timed out (took longer than 5 minutes)")
        return False
    except Exception as e:
        os.chdir(original_dir)
        print(f"ERROR: Failed to install frontend dependencies: {str(e)}")
        return False


def check_dependencies():
    """Check if all required dependencies are available"""
    errors = []
    
    # Check Python dependencies
    try:
        import fastapi #type: ignore
        import uvicorn #type: ignore
    except ImportError:
        errors.append("Python dependencies missing. Run: pip install -r requirements.txt")
    
    # Check if model exists
    model_path = BACKEND_DIR / "models" / "spam_detection_model.pkl"
    if not model_path.exists():
        errors.append(f"Model not found at {model_path}. Please ensure model is packaged.")
    
    # Check Node.js
    try:
        result = subprocess.run(
            ["node", "--version"],
            capture_output=True,
            text=True,
            timeout=5
        )
        if result.returncode != 0:
            errors.append("Node.js not found. Please install Node.js 16+")
    except (subprocess.TimeoutExpired, FileNotFoundError):
        errors.append("Node.js not found. Please install Node.js 16+")
    
    if errors:
        print("=" * 60)
        print("ERROR: Missing Dependencies")
        print("=" * 60)
        for error in errors:
            print(f"  X {error}")
        print("=" * 60)
        return False
    
    # Automatically install frontend dependencies if missing
    if not install_frontend_dependencies():
        return False
    
    return True


def start_backend():
    """Start the FastAPI backend server"""
    global backend_process
    
    print("Starting FastAPI backend...")
    os.chdir(BACKEND_DIR)
    
    backend_process = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "main:app", "--reload", "--port", "8000"],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1
    )
    
    # Print backend output in a separate thread
    def print_backend_output():
        if backend_process.stdout:
            for line in iter(backend_process.stdout.readline, ''):
                if line:
                    print(f"[Backend] {line.rstrip()}")
    
    Thread(target=print_backend_output, daemon=True).start()
    
    # Wait a moment to see if it starts successfully
    time.sleep(2)
    if backend_process.poll() is not None:
        print("ERROR: Backend failed to start!")
        return False
    
    print("Backend started: http://localhost:8000")
    print("  API Docs: http://localhost:8000/docs")
    return True


def start_frontend():
    """Start the React frontend development server"""
    global frontend_process
    
    print("Starting React frontend...")
    os.chdir(FRONTEND_DIR)
    
    # Determine npm command (npm or npm.cmd on Windows)
    npm_cmd = "npm.cmd" if sys.platform == "win32" else "npm"
    
    frontend_process = subprocess.Popen(
        [npm_cmd, "run", "dev"],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1
    )
    
    # Print frontend output in a separate thread
    def print_frontend_output():
        if frontend_process.stdout:
            for line in iter(frontend_process.stdout.readline, ''):
                if line:
                    print(f"[Frontend] {line.rstrip()}")
    
    Thread(target=print_frontend_output, daemon=True).start()
    
    # Wait a moment to see if it starts successfully
    time.sleep(3)
    if frontend_process.poll() is not None:
        print("ERROR: Frontend failed to start!")
        return False
    
    print("Frontend started: http://localhost:5173")
    return True


def cleanup(signum=None, frame=None):
    """Cleanup function to stop both servers"""
    global backend_process, frontend_process
    
    print("\n" + "=" * 60)
    print("Shutting down servers...")
    print("=" * 60)
    
    if backend_process:
        print("Stopping backend...")
        backend_process.terminate()
        try:
            backend_process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            backend_process.kill()
        print("Backend stopped")
    
    if frontend_process:
        print("Stopping frontend...")
        frontend_process.terminate()
        try:
            frontend_process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            frontend_process.kill()
        print("Frontend stopped")
    
    print("=" * 60)
    sys.exit(0)


def main():
    """Main function to start the application"""
    # register signal handlers for shutdown
    signal.signal(signal.SIGINT, cleanup)
    signal.signal(signal.SIGTERM, cleanup)
    
    print("=" * 60)
    print("ShieldMail - Spam Detection Web Application")
    print("=" * 60)
    print()
    
    # check dependencies
    if not check_dependencies():
        sys.exit(1)
    
    # start backend
    if not start_backend():
        cleanup()
        sys.exit(1)
    
    # small delay between starts
    time.sleep(1)
    
    # start frontend
    if not start_frontend():
        cleanup()
        sys.exit(1)
    
    print()
    print("=" * 60)
    print("Application Started Successfully!")
    print("=" * 60)
    print("Backend:  http://localhost:8000")
    print("Frontend: http://localhost:5173")
    print()
    print("Press Ctrl+C to stop both servers")
    print("=" * 60)
    print()
    
        # keep the main process alive
    try:
        while True:
            # check if processes are still running
            if backend_process and backend_process.poll() is not None:
                print("ERROR: Backend process died!")
                cleanup()
                sys.exit(1)
            
            if frontend_process and frontend_process.poll() is not None:
                print("ERROR: Frontend process died!")
                cleanup()
                sys.exit(1)
            
            time.sleep(1)
    except KeyboardInterrupt:
        cleanup()


if __name__ == "__main__":
    main()