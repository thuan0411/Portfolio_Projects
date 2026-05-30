"""
Train and save ML models for Assignment 3 web application
This script trains the Naive Bayes model and saves it along with the vectorizer
"""

import os
import sys
from pathlib import Path
import joblib
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB, BernoulliNB
from sklearn.pipeline import Pipeline
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
import warnings
warnings.filterwarnings('ignore')

# Add data_processing to path (in sibling Assignment_2 directory)
SCRIPT_DIR = Path(__file__).parent  # assignment_3 directory
PARENT_DIR = SCRIPT_DIR.parent  # COS30049-Project directory
ASSIGNMENT_2_DIR = PARENT_DIR / "Assignment_2"  # Assignment_2 is now a sibling
sys.path.insert(0, str(ASSIGNMENT_2_DIR / "data_processing"))

# Import data processor
from data_processor import clean_text

# Setup paths - access Assignment_2 as sibling directory
PROCESSED_DIR = ASSIGNMENT_2_DIR / "outputs" / "processed"
MODELS_DIR = SCRIPT_DIR / "models"  # Models stored in assignment_3/models
MODELS_DIR.mkdir(exist_ok=True)

def train_naive_bayes_model():
    """Train and save the best Naive Bayes model"""
    print("=" * 60)
    print("TRAINING AND SAVING MODELS FOR WEB APPLICATION")
    print("=" * 60)
    
    # Load processed data
    print("\n1. Loading processed data...")
    merged_path = PROCESSED_DIR / "emails_merged.processed.csv"
    if not merged_path.exists():
        print(f"Error: {merged_path} not found. Please run data_processor.py first.")
        return False
    
    df = pd.read_csv(merged_path)
    print(f"Loaded {len(df)} samples")
    print(f"Spam ratio: {df['label'].mean():.3f}")
    
    # Split data
    print("\n2. Splitting data...")
    X = df['text'].astype(str)
    y = df['label'].astype(int)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    print(f"Training: {len(X_train)}, Testing: {len(X_test)}")
    
    # Create and train vectorizer
    print("\n3. Creating TF-IDF vectorizer...")
    vectorizer = TfidfVectorizer(
        max_features=10000,
        stop_words='english',
        ngram_range=(1, 2),
        min_df=2,
        max_df=0.95
    )
    X_train_vec = vectorizer.fit_transform(X_train)
    X_test_vec = vectorizer.transform(X_test)
    print(f"Feature matrix: {X_train_vec.shape}")
    
    # Train multiple NB models
    print("\n4. Training Naive Bayes models...")
    models = {
        'MultinomialNB': MultinomialNB(alpha=1.0),
        'BernoulliNB': BernoulliNB(alpha=1.0)
    }
    
    results = {}
    for name, model in models.items():
        print(f"  Training {name}...")
        model.fit(X_train_vec, y_train)
        y_pred = model.predict(X_test_vec)
        
        acc = accuracy_score(y_test, y_pred)
        pre = precision_score(y_test, y_pred, zero_division=0)
        rec = recall_score(y_test, y_pred, zero_division=0)
        f1 = f1_score(y_test, y_pred, zero_division=0)
        
        results[name] = {
            'model': model,
            'accuracy': acc,
            'precision': pre,
            'recall': rec,
            'f1': f1
        }
        print(f"    Accuracy: {acc:.4f}, F1: {f1:.4f}")
    
    # Select best model
    best_name = max(results.keys(), key=lambda k: results[k]['f1'])
    best_model = results[best_name]['model']
    print(f"\nBest model: {best_name} (F1={results[best_name]['f1']:.4f})")
    
    # Create pipeline with vectorizer and model
    print("\n5. Creating pipeline...")
    pipeline = Pipeline([
        ('vectorizer', vectorizer),
        ('classifier', best_model)
    ])
    
    # Retrain pipeline on full training data for consistency
    pipeline.fit(X_train, y_train)
    
    # Final evaluation
    y_pred = pipeline.predict(X_test)
    y_proba = pipeline.predict_proba(X_test)[:, 1]
    final_acc = accuracy_score(y_test, y_pred)
    final_f1 = f1_score(y_test, y_pred, zero_division=0)
    print(f"Final pipeline performance - Accuracy: {final_acc:.4f}, F1: {final_f1:.4f}")
    
    # Save pipeline
    print("\n6. Saving model...")
    model_path = MODELS_DIR / "spam_detection_model.pkl"
    joblib.dump(pipeline, model_path)
    print(f"Model saved to: {model_path}")
    
    # Save model metadata
    metadata = {
        'model_type': best_name,
        'accuracy': float(final_acc),
        'precision': float(results[best_name]['precision']),
        'recall': float(results[best_name]['recall']),
        'f1_score': float(final_f1),
        'n_features': X_train_vec.shape[1],
        'n_train_samples': len(X_train),
        'n_test_samples': len(X_test)
    }
    
    import json
    metadata_path = MODELS_DIR / "model_metadata.json"
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)
    print(f"Metadata saved to: {metadata_path}")
    
    print("\n" + "=" * 60)
    print("MODEL TRAINING COMPLETED SUCCESSFULLY")
    print("=" * 60)
    return True

if __name__ == "__main__":
    success = train_naive_bayes_model()
    sys.exit(0 if success else 1)

