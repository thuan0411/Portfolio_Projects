"""
Model Service for loading and using the spam detection model.
This service loads the packaged AI model from Assignment 2 that is included in Assignment 3.
"""

import os
import sys
from pathlib import Path
import joblib 
import json
import numpy as np
from typing import Dict, Optional
import warnings

# suppress scikit-learn warnings
warnings.filterwarnings('ignore', category=UserWarning, module='sklearn')


class ModelService:
    """
    Service for managing the spam detection model.
    
    This service loads the packaged AI model that was trained in Assignment 2
    and is included in Assignment 3's models directory for standalone execution.
    """
    
    def __init__(self):
        """Initialize the model service and load the packaged model"""
        self.model = None
        self.metadata = None
        self.model_path = None
        self._load_model()
    
    def _load_model(self):
        """
        Load the trained model from Assignment 3's models directory.
        This model was trained in Assignment 2 and packaged for Assignment 3.
        """
        try:
            script_dir = Path(__file__).parent  # backend directory
            model_path = script_dir / "models" / "spam_detection_model.pkl"
            metadata_path = script_dir / "models" / "model_metadata.json"
            
            if not model_path.exists():
                print(f"Warning: Model not found at {model_path}")
                print("Please ensure the model is packaged in backend/models/ from Assignment 2.")
                return
            
            # load model
            self.model = joblib.load(model_path)
            self.model_path = model_path
            
            # load metadata if available
            if metadata_path.exists():
                with open(metadata_path, 'r') as f:
                    self.metadata = json.load(f)
            else:
                self.metadata = {
                    'model_type': 'Unknown',
                    'accuracy': 0.0,
                    'precision': 0.0,
                    'recall': 0.0,
                    'f1_score': 0.0
                }
            
            print(f"Model loaded successfully from {model_path}")
            
        except Exception as e:
            print(f"Error loading model: {str(e)}")
            self.model = None
            self.metadata = None
    
    def is_model_loaded(self) -> bool:
        """Check if model is loaded"""
        return self.model is not None
    
    def predict(self, text: str) -> Dict:
        """
        Predict if text is spam using the packaged AI model.
        
        This method uses the AI model trained in Assignment 2 that is packaged
        within Assignment 3 for standalone execution.
        
        Args:
            text: Input text to classify (email text)
        
        Returns:
            Dictionary with prediction results:
            - is_spam: bool - True if spam, False if legitimate
            - spam_probability: float - Probability of being spam (0-1)
            - safe_probability: float - Probability of being legitimate (0-1)
        """
        if not self.is_model_loaded():
            raise ValueError("Model is not loaded. Please ensure the model is packaged in backend/models/.")
        
        if not text or not text.strip():
            raise ValueError("Input text cannot be empty")
        
        try:
            # get prediction probabilities
            probabilities = self.model.predict_proba([text])[0]
            
            # get prediction class
            prediction = self.model.predict([text])[0]
            
            # extract probabilities
            # Class 0 = safe (legitimate), Class 1 = spam
            safe_prob = float(probabilities[0])
            spam_prob = float(probabilities[1])
            
            # determine if spam (1 = spam, 0 = safe)
            is_spam = bool(prediction == 1)
            
            return {
                'is_spam': is_spam,
                'spam_probability': spam_prob,
                'safe_probability': safe_prob
            }
            
        except Exception as e:
            raise ValueError(f"Prediction failed: {str(e)}")
    
    def get_metadata(self) -> Dict:
        """Get model metadata"""
        metadata = self.metadata or {}
        metadata['source'] = 'Assignment_2_Packaged'
        return metadata
    
    def get_model_info(self) -> Dict:
        """Get comprehensive model information"""
        return {
            'is_loaded': self.is_model_loaded(),
            'model_path': str(self.model_path) if self.model_path else None,
            'metadata': self.get_metadata(),
            'integration_status': 'Standalone - AI model from Assignment 2 packaged in Assignment 3'
        }

