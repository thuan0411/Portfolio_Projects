# Assignment 3 - ShieldMail Web Application

**Standalone full-stack spam detection application with packaged AI model from Assignment 2.**

## Overview

Assignment 3 is a complete, standalone web application that includes:
- **FastAPI backend** with AI model integration
- **React.js frontend** with interactive visualizations
- **Packaged AI model** from Assignment 2 (included in `backend/models/` directory)
- **Standalone dependencies** - no dependency on Assignment 2

The application runs independently and does not require Assignment 2 to be present.

## Prerequisites

- **Python 3.8+**
- **Node.js 16+** and npm (will be installed automatically when running main.py)
- **AI model** in `backend/models/spam_detection_model.pkl` (should already be packaged)

## Quick Start

### 1. Setup Python Environment

**Linux/macOS:**
```bash
cd Assignment_3

# Create virtual environment
python -m venv venv
source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt
```

**Windows (PowerShell):**
```powershell
cd Assignment_3

# Create virtual environment
python -m venv venv

# Fix PowerShell execution policy (if needed)
Set-ExecutionPolicy Bypass -Scope Process

# Activate virtual environment
venv\Scripts\Activate

# Install Python dependencies
pip install -r requirements.txt
```

**Note:** If you encounter execution policy errors on Windows, run `Set-ExecutionPolicy Bypass -Scope Process` before activating the virtual environment.

**Note:** Frontend dependencies (npm packages) will be automatically installed when you run `python main.py`. No need to run `npm install` manually!

### 2. AI Model Integration Configuration

The AI model from Assignment 2 should already be packaged in the `backend/models/` directory. If the model files are missing, follow these steps:

**Required Files:**
- `backend/models/spam_detection_model.pkl` - The trained spam detection model
- `backend/models/model_metadata.json` - Model metadata (optional but recommended)

**If Model Files Are Missing:**

1. **Copy from Assignment 2:**
   ```bash
   # From Assignment 2's outputs/models/ to Assignment_3/backend/models/
   cp ../Assignment_2/outputs/models/spam_detection_model.pkl backend/models/
   cp ../Assignment_2/outputs/models/model_metadata.json backend/models/
   ```

2. **Verify Model Files:**
   ```bash
   # Check if model files exist
   ls backend/models/spam_detection_model.pkl
   ls backend/models/model_metadata.json
   ```

**Model Loading:**
- The model is automatically loaded by `ModelService` when the backend starts
- The model service is initialized in `backend/main.py` and loads from `backend/models/`
- No additional configuration is needed - the model is loaded automatically on application startup
- You can verify the model loaded successfully by checking the backend startup logs or visiting `http://localhost:8000/api/model/info`

**Verification:**
After starting the application, you can verify the model is loaded:
- Check backend console output for: `Model loaded successfully from ...`
- Visit `http://localhost:8000/api/health` to see model loading status
- Visit `http://localhost:8000/api/model/info` for detailed model information

### 3. Start Application

Start both backend and frontend with a single command:

**Linux/macOS:**
```bash
python main.py
```

**Windows (PowerShell):**
```powershell
python main.py
```

**Note:** If you encounter PowerShell execution policy errors on Windows, run `Set-ExecutionPolicy Bypass -Scope Process` first (you should have already done this in step 1).

This will start:
- **Backend**: http://localhost:8000
- **Frontend**: http://localhost:5173

Press `Ctrl+C` to stop both servers.

**Alternative: Start separately (if needed)**

If you prefer to run them separately:

**Terminal 1 (Backend):**

**Linux/macOS:**
```bash
cd backend
uvicorn main:app --reload --port 8000
```

**Windows (PowerShell):**
```powershell
cd backend
uvicorn main:app --reload --port 8000
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm run dev
```

### 4. Use the Application

1. Open http://localhost:5173 in your browser
2. Enter email text in the input field
3. Click "Predict" to get spam detection results
4. View statistics dashboard and prediction history in other tabs

## Project Structure

```
Assignment_3/
├── backend/                    # FastAPI backend
│   ├── models/                 # Packaged AI model from Assignment 2
│   │   ├── spam_detection_model.pkl
│   │   └── model_metadata.json
│   ├── main.py                # API endpoints
│   ├── model_service.py       # AI model loader (packaged from Assignment 2)
│   └── prediction_store.py    # In-memory prediction storage
├── frontend/                   # React.js frontend
│   ├── src/
│   │   ├── components/        # React components
│   │   ├── App.jsx           # Main application
│   │   └── main.jsx          # Entry point
│   ├── package.json
│   └── vite.config.js
├── main.py                     # Main entry point (starts both servers)
└── requirements.txt            # Python dependencies (standalone)
```

## API Endpoints

- `POST /api/predict` - Predict spam for single email
- `POST /api/batch-predict` - Predict spam for multiple emails
- `GET /api/predictions` - Get all predictions
- `GET /api/predictions/{id}` - Get specific prediction
- `PUT /api/predictions/{id}` - Update prediction feedback
- `DELETE /api/predictions/{id}` - Delete prediction
- `GET /api/stats` - Get statistics
- `GET /api/health` - Health check
- `GET /api/model/info` - Model information

See http://localhost:8000/docs for interactive API documentation.

## Dependencies

### Python (requirements.txt)

- **FastAPI** - Web framework for API
- **Uvicorn** - ASGI server
- **Pydantic** - Data validation
- **scikit-learn** - Machine learning (for model loading)
- **joblib** - Model serialization
- **numpy** - Numerical operations
- **pandas** - Data processing (for optional model training)

### Node.js (package.json)

Dependencies are managed in `frontend/package.json`. They are **automatically installed** when you run `python main.py` - no manual `npm install` needed!

## Troubleshooting

### Backend Issues

- **Model not found**: Ensure `backend/models/spam_detection_model.pkl` exists
- **Import errors**: Activate virtual environment and run `pip install -r requirements.txt`
- **Port 8000 in use**: Change port: `uvicorn main:app --reload --port 8001`

### Frontend Issues

- **npm install fails**: Check Node.js version (16+ required). If automatic installation fails, try manually:
  ```bash
  cd frontend
  npm install
  ```
- **Vite plugin errors**: Try cleaning and reinstalling:
  ```bash
  cd frontend
  rm -rf node_modules package-lock.json
  npm cache clean --force
  npm install
  ```
- **Port 5173 in use**: Vite will automatically use next available port
- **Cannot connect to backend**: Ensure backend is running on port 8000

### General Issues

- **No UI appears**: Make sure both backend AND frontend are running
- **Predictions fail**: Check backend logs for model loading errors
- **CORS errors**: Backend CORS is configured for localhost:5173 and localhost:3000

### Windows Issues

- **PowerShell execution policy error**: If you encounter "cannot be loaded because running scripts is disabled" error when activating the virtual environment, run:
  ```powershell
  Set-ExecutionPolicy Bypass -Scope Process
  ```
  This bypasses the execution policy for the current PowerShell session only (safe and temporary).
- **Virtual environment activation fails**: Make sure you're using PowerShell (not Command Prompt) and run the execution policy command above before activation.

## Important Notes

1. **Single command startup**: Use `python main.py` to start both servers at once
2. **Automatic npm install**: Frontend dependencies are automatically installed if missing - no manual `npm install` needed!
3. **Backend shows text/JSON**: This is normal - it's an API server, not a UI
4. **Frontend shows the UI**: Open the URL (http://localhost:5173) in your browser
5. **Standalone execution**: Assignment 3 runs independently - no Assignment 2 needed
6. **Model packaging**: The AI model from Assignment 2 is packaged in `backend/models/` directory
7. **Own dependencies**: Assignment 3 has its own `requirements.txt` - no dependency on Assignment 2
8. **Graceful shutdown**: Press `Ctrl+C` to stop both servers cleanly

## Requirements Compliance

- **Standalone execution**: No dependency on Assignment 2 at runtime
- **Standalone dependencies**: Own `requirements.txt` - no reference to Assignment 2
- **Packaged AI model**: Model from Assignment 2 included in `backend/models/` directory
- **FastAPI backend**: RESTful API with multiple HTTP methods (GET, POST, PUT, DELETE)
- **React.js frontend**: Interactive UI with data visualizations
- **Error handling**: Comprehensive error handling and input validation
- **API integration**: AI model integrated into FastAPI backend
