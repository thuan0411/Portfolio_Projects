import React from 'react'
import './PredictionResults.css'

const PredictionResults = ({ prediction }) => {
  if (!prediction) return null

  const spamPercentage = (prediction.spam_probability * 100).toFixed(2)
  const safePercentage = (prediction.safe_probability * 100).toFixed(2)
  const isSpam = prediction.is_spam

  return (
    <div className="prediction-results">
      <div className={`card result-card ${isSpam ? 'spam' : 'safe'}`}>
        <div className="result-header">
          <h2 className={isSpam ? 'spam-title' : 'safe-title'}>
            {isSpam ? 'Spam Detected' : 'Legitimate Email'}
          </h2>
          <div className={`status-badge ${isSpam ? 'spam-badge' : 'safe-badge'}`}>
            {isSpam ? 'SPAM' : 'SAFE'}
          </div>
        </div>

        <div className="probability-bar-container">
          <div className="probability-info">
            <div className="prob-item spam-prob">
              <span className="prob-label">Spam Probability</span>
              <span className="prob-value">{spamPercentage}%</span>
            </div>
            <div className="prob-item safe-prob">
              <span className="prob-label">Safe Probability</span>
              <span className="prob-value">{safePercentage}%</span>
            </div>
          </div>
          
          <div className="probability-bar">
            <div 
              className="prob-bar-spam" 
              style={{ width: `${spamPercentage}%` }}
            />
            <div 
              className="prob-bar-safe" 
              style={{ width: `${safePercentage}%` }}
            />
          </div>
        </div>

        <div className="model-info">
          <h3>Model Information</h3>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">Model Type:</span>
              <span className="info-value">
                {prediction.model_metadata?.model_type || 'Naive Bayes'}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">Accuracy:</span>
              <span className="info-value">
                {prediction.model_metadata?.accuracy 
                  ? `${(prediction.model_metadata.accuracy * 100).toFixed(2)}%`
                  : 'N/A'}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">F1 Score:</span>
              <span className="info-value">
                {prediction.model_metadata?.f1_score 
                  ? prediction.model_metadata.f1_score.toFixed(4)
                  : 'N/A'}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">Timestamp:</span>
              <span className="info-value">
                {new Date(prediction.timestamp).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PredictionResults

