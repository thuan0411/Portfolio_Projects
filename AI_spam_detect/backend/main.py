"""
FastAPI Backend for ShieldMail Spam Detection Web Application
Provides API endpoints for spam detection and model interaction
"""

from fastapi import FastAPI, HTTPException, status  # type: ignore
from fastapi.middleware.cors import CORSMiddleware  # type: ignore
from fastapi.responses import JSONResponse  # type: ignore
from pydantic import BaseModel, Field, validator  # type: ignore
from typing import List, Optional, Dict
import os
from pathlib import Path
import sys
import traceback
from datetime import datetime
import uuid
import warnings

# silence scikit-learn warnings
warnings.filterwarnings('ignore', category=UserWarning, module='sklearn')

# add parent directory for imports
parent_dir = Path(__file__).parent.parent
sys.path.insert(0, str(parent_dir))

from backend.model_service import ModelService
from backend.prediction_store import PredictionStore

# initialize FastAPI 
app = FastAPI(
    title="ShieldMail API",
    description="Spam Detection API for ShieldMail Web Application",
    version="1.0.0"
)

# CORS middleware for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# initialize services
model_service = ModelService()
prediction_store = PredictionStore()

# pydantic models for request n response validation
class PredictionRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=50000, description="Email text to analyze")
    
    @validator('text')
    def text_must_not_be_empty(cls, v):
        if not v or not v.strip():
            raise ValueError('Text cannot be empty')
        return v.strip()

class PredictionResponse(BaseModel):
    prediction_id: str
    text: str
    is_spam: bool
    spam_probability: float
    safe_probability: float
    timestamp: str
    model_metadata: Dict

class BatchPredictionRequest(BaseModel):
    texts: List[str] = Field(..., min_items=1, max_items=100)
    
    @validator('texts')
    def texts_must_not_be_empty(cls, v):
        if not v or len(v) == 0:
            raise ValueError('Texts list cannot be empty')
        return [t.strip() for t in v if t.strip()]

class BatchPredictionResponse(BaseModel):
    predictions: List[PredictionResponse]
    total_processed: int
    total_spam: int
    total_safe: int

class UpdatePredictionRequest(BaseModel):
    feedback: str = Field(..., pattern="^(correct|incorrect)$", description="Feedback: 'correct' or 'incorrect'")

class PredictionStatsResponse(BaseModel):
    total_predictions: int
    spam_count: int
    safe_count: int
    accuracy_feedback: float
    recent_predictions: List[PredictionResponse]

# root endpoint
@app.get("/", tags=["General"])
async def root():
    """Root endpoint providing API information"""
    return {
        "message": "Welcome to ShieldMail API",
        "version": "1.0.0",
        "status": "active",
        "endpoints": {
            "predict": "POST /api/predict",
            "batch_predict": "POST /api/batch-predict",
            "predictions": "GET /api/predictions",
            "prediction_by_id": "GET /api/predictions/{prediction_id}",
            "update_prediction": "PUT /api/predictions/{prediction_id}",
            "delete_prediction": "DELETE /api/predictions/{prediction_id}",
            "stats": "GET /api/stats",
            "health": "GET /api/health",
            "model_info": "GET /api/model/info"
        }
    }

# health check endpoint
@app.get("/api/health", tags=["General"])
async def health_check():
    """
    Health check endpoint.
    Returns service health status and model loading status.
    """
    try:
        model_loaded = model_service.is_model_loaded()
        model_info = model_service.get_model_info() if hasattr(model_service, 'get_model_info') else {}
        return {
            "status": "healthy",
            "model_loaded": model_loaded,
            "timestamp": datetime.now().isoformat(),
            "model_info": model_info
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Service unhealthy: {str(e)}"
        )

# model information endpoint
# generate sample data endpoint via POST
@app.post("/api/generate-sample-data", tags=["Predictions"], status_code=status.HTTP_201_CREATED)
async def generate_sample_data():
    """
    Generate sample prediction data with specific dates and labels.
    
    Creates 5 predictions:
    1. Safe, predicted on 31st October
    2. Spam, predicted on 2nd November
    3. Spam, predicted on 3rd November
    4. Safe, predicted on 5th November
    5. Spam, predicted on 6th November
    
    Each prediction has unique spam probability values.
    """
    try:
        if not model_service.is_model_loaded():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Model not loaded. Please train and save the model first."
            )
        
        # get current year
        current_year = datetime.now().year
        
        # define sample data with dates and desired labels
        sample_data = [
            {
                'text': 'Hello, I hope this email finds you well. I wanted to follow up on our previous discussion about the project timeline. Please let me know if you have any questions.',
                'date': f'{current_year}-10-31T10:00:00',
                'desired_label': 'safe'  # Should be safe
            },
            {
                'text': 'WINNER! You have been selected to receive a FREE prize! Click now to claim your $1000 cash reward! Limited time offer!',
                'date': f'{current_year}-11-02T14:30:00',
                'desired_label': 'spam'  # Should be spam
            },
            {
                'text': 'URGENT! Act now! Get rich quick! Make money fast! No investment required! Click here for instant cash!',
                'date': f'{current_year}-11-03T09:15:00',
                'desired_label': 'spam'  # Should be spam
            },
            {
                'text': 'Thank you for your email. I appreciate your time and consideration. I will review the documents and get back to you by the end of the week.',
                'date': f'{current_year}-11-05T16:45:00',
                'desired_label': 'safe'  # Should be safe
            },
            {
                'text': 'Congratulations! You won $5000! Claim your prize now! Free money! No strings attached! Click here immediately!',
                'date': f'{current_year}-11-06T11:20:00',
                'desired_label': 'spam'  # Should be spam
            }
        ]
        
        created_predictions = []
        
        # define unique probabilities for each prediction
        # safe predictions: low spam probability (0.15, 0.20, 0.25, 0.30, 0.35)
        # spam predictions: high spam probability (0.65, 0.70, 0.75, 0.80, 0.85)
        unique_probabilities = [0.15, 0.65, 0.70, 0.20, 0.75]  # Matching the order of sample_data
        
        for idx, sample in enumerate(sample_data):
            # get prediction from model 
            model_result = model_service.predict(sample['text'])
            
            # override with desired label and unique probability
            spam_prob = unique_probabilities[idx]
            safe_prob = 1.0 - spam_prob
            is_spam = sample['desired_label'] == 'spam'
            
            result = {
                'is_spam': is_spam,
                'spam_probability': spam_prob,
                'safe_probability': safe_prob
            }
            
            # create prediction
            prediction_id = str(uuid.uuid4())
            prediction_response = PredictionResponse(
                prediction_id=prediction_id,
                text=sample['text'][:100] + "..." if len(sample['text']) > 100 else sample['text'],
                is_spam=result['is_spam'],
                spam_probability=result['spam_probability'],
                safe_probability=result['safe_probability'],
                timestamp=sample['date'],
                model_metadata=model_service.get_metadata()
            )
            
            # store prediction with custom timestamp
            prediction_store.add_prediction(prediction_id, sample['text'], result, custom_timestamp=sample['date'])
            
            created_predictions.append(prediction_response)
        
        return {
            'message': 'Sample data generated successfully',
            'predictions_created': len(created_predictions),
            'predictions': created_predictions
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate sample data: {str(e)}"
        )

@app.get("/api/model/info", tags=["General"])
async def get_model_info():
    """
    Get model information.
    Returns details about the packaged AI model from Assignment 2.
    """
    try:
        model_info = model_service.get_model_info() if hasattr(model_service, 'get_model_info') else {}
        return {
            "status": "active",
            "model_info": model_info,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get model info: {str(e)}"
        )

# prediction endpoint via POST
@app.post("/api/predict", response_model=PredictionResponse, tags=["Predictions"], status_code=status.HTTP_201_CREATED)
async def predict_spam(request: PredictionRequest):
    """
    Predict if an email text is spam
    
    - **text**: The email text to analyze (required, 1-50000 characters)
    
    Returns prediction with spam probability and classification
    """
    try:
        if not model_service.is_model_loaded():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Model not loaded. Please train and save the model first."
            )
        
        # get prediction
        result = model_service.predict(request.text)
        
        # create prediction response
        prediction_id = str(uuid.uuid4())
        prediction_response = PredictionResponse(
            prediction_id=prediction_id,
            text=request.text[:100] + "..." if len(request.text) > 100 else request.text,  # Truncate for response
            is_spam=result['is_spam'],
            spam_probability=result['spam_probability'],
            safe_probability=result['safe_probability'],
            timestamp=datetime.now().isoformat(),
            model_metadata=model_service.get_metadata()
        )
        
        # store prediction (with custom timestamp if provided)
        custom_timestamp = getattr(request, 'timestamp', None)
        prediction_store.add_prediction(prediction_id, request.text, result, custom_timestamp=custom_timestamp)
        
        return prediction_response
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Prediction failed: {str(e)}"
        )

# batch prediction endpoint via POST
@app.post("/api/batch-predict", response_model=BatchPredictionResponse, tags=["Predictions"])
async def batch_predict_spam(request: BatchPredictionRequest):
    """
    Predict spam for multiple email texts in batch
    
    - **texts**: List of email texts to analyze (1-100 texts)
    
    Returns batch predictions with summary statistics
    """
    try:
        if not model_service.is_model_loaded():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Model not loaded. Please train and save the model first."
            )
        
        predictions = []
        total_spam = 0
        total_safe = 0
        
        for text in request.texts:
            result = model_service.predict(text)
            prediction_id = str(uuid.uuid4())
            
            prediction_response = PredictionResponse(
                prediction_id=prediction_id,
                text=text[:100] + "..." if len(text) > 100 else text,
                is_spam=result['is_spam'],
                spam_probability=result['spam_probability'],
                safe_probability=result['safe_probability'],
                timestamp=datetime.now().isoformat(),
                model_metadata=model_service.get_metadata()
            )
            
            predictions.append(prediction_response)
            prediction_store.add_prediction(prediction_id, text, result)
            
            if result['is_spam']:
                total_spam += 1
            else:
                total_safe += 1
        
        return BatchPredictionResponse(
            predictions=predictions,
            total_processed=len(predictions),
            total_spam=total_spam,
            total_safe=total_safe
        )
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Batch prediction failed: {str(e)}"
        )

# get all predictions via GET
@app.get("/api/predictions", response_model=List[PredictionResponse], tags=["Predictions"])
async def get_predictions(limit: Optional[int] = 50, offset: Optional[int] = 0):
    """
    Get all stored predictions
    
    - **limit**: Maximum number of predictions to return (default: 50, max: 500)
    - **offset**: Number of predictions to skip (default: 0)
    
    Returns list of predictions sorted by timestamp (newest first)
    """
    try:
        limit = min(limit or 50, 500)
        offset = max(offset or 0, 0)
        
        all_predictions = prediction_store.get_all_predictions(limit=limit, offset=offset)
        return all_predictions
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve predictions: {str(e)}"
        )

# get prediction by ID via GET
@app.get("/api/predictions/{prediction_id}", response_model=PredictionResponse, tags=["Predictions"])
async def get_prediction_by_id(prediction_id: str):
    """
    Get a specific prediction by ID
    
    - **prediction_id**: Unique prediction identifier
    
    Returns the prediction if found
    """
    try:
        prediction = prediction_store.get_prediction(prediction_id)
        if not prediction:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Prediction with ID {prediction_id} not found"
            )
        return prediction
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve prediction: {str(e)}"
        )

# Update prediction feedback - PUT
@app.put("/api/predictions/{prediction_id}", tags=["Predictions"])
async def update_prediction(prediction_id: str, request: UpdatePredictionRequest):
    """
    Update feedback for a prediction
    
    - **prediction_id**: Unique prediction identifier
    - **feedback**: Either 'correct' or 'incorrect'
    
    Updates the feedback status for the prediction
    """
    try:
        success = prediction_store.update_feedback(prediction_id, request.feedback)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Prediction with ID {prediction_id} not found"
            )
        
        return {
            "message": "Prediction feedback updated successfully",
            "prediction_id": prediction_id,
            "feedback": request.feedback
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update prediction: {str(e)}"
        )

# delete prediction via DELETE
@app.delete("/api/predictions/{prediction_id}", tags=["Predictions"])
async def delete_prediction(prediction_id: str):
    """
    Delete a prediction by ID
    
    - **prediction_id**: Unique prediction identifier
    
    Deletes the prediction from storage
    """
    try:
        success = prediction_store.delete_prediction(prediction_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Prediction with ID {prediction_id} not found"
            )
        
        return {
            "message": "Prediction deleted successfully",
            "prediction_id": prediction_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete prediction: {str(e)}"
        )

# get statistics via GET
@app.get("/api/stats", response_model=PredictionStatsResponse, tags=["Statistics"])
async def get_stats():
    """
    Get statistics about predictions
    
    Returns summary statistics including total predictions, spam/safe counts,
    accuracy feedback, and recent predictions
    """
    try:
        stats = prediction_store.get_stats()
        return stats
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve statistics: {str(e)}"
        )

# global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler for unhandled exceptions"""
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "Internal server error",
            "error": str(exc),
            "path": str(request.url)
        }
    )

if __name__ == "__main__":
    import uvicorn  # type: ignore
    uvicorn.run(app, host="0.0.0.0", port=8000)

