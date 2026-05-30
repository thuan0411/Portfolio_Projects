"""
In-memory prediction store for managing predictions
In production, this would use a database
"""

from typing import List, Optional, Dict
from datetime import datetime
import sys
from pathlib import Path

# add parent directory to path for imports
parent_dir = Path(__file__).parent.parent
if str(parent_dir) not in sys.path:
    sys.path.insert(0, str(parent_dir))

from backend.model_service import ModelService

from pydantic import BaseModel

# import PredictionResponse schema
class PredictionResponse(BaseModel):
    prediction_id: str
    text: str
    is_spam: bool
    spam_probability: float
    safe_probability: float
    timestamp: str
    model_metadata: Dict
    feedback: Optional[str] = None

class PredictionStore:
    """In-memory store for predictions"""
    
    def __init__(self):
        self._predictions: Dict[str, Dict] = {}
        self._model_service = ModelService()
    
    def add_prediction(self, prediction_id: str, text: str, result: Dict, custom_timestamp: Optional[str] = None):
        """Add a prediction to the store"""
        timestamp = custom_timestamp if custom_timestamp else datetime.now().isoformat()
        self._predictions[prediction_id] = {
            'prediction_id': prediction_id,
            'text': text,
            'is_spam': result['is_spam'],
            'spam_probability': result['spam_probability'],
            'safe_probability': result['safe_probability'],
            'timestamp': timestamp,
            'model_metadata': self._model_service.get_metadata(),
            'feedback': None
        }
    
    def get_prediction(self, prediction_id: str) -> Optional[PredictionResponse]:
        """Get a prediction by ID"""
        if prediction_id not in self._predictions:
            return None
        
        data = self._predictions[prediction_id].copy()
        # truncate text for response
        if len(data['text']) > 100:
            data['text'] = data['text'][:100] + "..."
        
        return PredictionResponse(**data)
    
    def get_all_predictions(self, limit: int = 50, offset: int = 0) -> List[PredictionResponse]:
        """Get all predictions with pagination"""
        # sort by timestamp (newest first)
        sorted_predictions = sorted(
            self._predictions.values(),
            key=lambda x: x['timestamp'],
            reverse=True
        )
        
        # apply pagination
        paginated = sorted_predictions[offset:offset + limit]
        
        # convert to response models
        results = []
        for pred in paginated:
            data = pred.copy()
            # truncate text for response
            if len(data['text']) > 100:
                data['text'] = data['text'][:100] + "..."
            results.append(PredictionResponse(**data))
        
        return results
    
    def update_feedback(self, prediction_id: str, feedback: str) -> bool:
        """Update feedback for a prediction"""
        if prediction_id not in self._predictions:
            return False
        
        self._predictions[prediction_id]['feedback'] = feedback
        return True
    
    def delete_prediction(self, prediction_id: str) -> bool:
        """Delete a prediction"""
        if prediction_id not in self._predictions:
            return False
        
        del self._predictions[prediction_id]
        return True
    
    def get_stats(self) -> Dict:
        """Get statistics about predictions"""
        total = len(self._predictions)
        spam_count = sum(1 for p in self._predictions.values() if p['is_spam'])
        safe_count = total - spam_count
        
        # calculate accuracy from feedback
        feedback_count = sum(1 for p in self._predictions.values() if p['feedback'] == 'correct')
        total_feedback = sum(1 for p in self._predictions.values() if p['feedback'] is not None)
        accuracy = (feedback_count / total_feedback * 100) if total_feedback > 0 else 0.0
        
        # get recent predictions (last 10)
        sorted_predictions = sorted(
            self._predictions.values(),
            key=lambda x: x['timestamp'],
            reverse=True
        )
        recent = sorted_predictions[:10]
        
        recent_responses = []
        for pred in recent:
            data = pred.copy()
            if len(data['text']) > 100:
                data['text'] = data['text'][:100] + "..."
            recent_responses.append(PredictionResponse(**data).dict())
        
        return {
            'total_predictions': total,
            'spam_count': spam_count,
            'safe_count': safe_count,
            'accuracy_feedback': round(accuracy, 2),
            'recent_predictions': recent_responses
        }

