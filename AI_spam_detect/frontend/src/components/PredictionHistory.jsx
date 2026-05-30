import React, { useMemo } from 'react'
import './PredictionHistory.css'

const PredictionHistory = ({ predictions, onDelete, onRefresh, onGenerateSampleData, loading, stats }) => {
  // calc summary statistics
  const summaryStats = useMemo(() => {
    if (!predictions || predictions.length === 0) {
      return { total: 0, spamCount: 0, safeCount: 0 }
    }
    const spamCount = predictions.filter(p => p.is_spam).length
    const safeCount = predictions.length - spamCount
    return {
      total: predictions.length,
      spamCount,
      safeCount
    }
  }, [predictions])
  const exportHistory = () => {
    if (!predictions || predictions.length === 0) return

    const csvContent = [
      ['Prediction ID', 'Text', 'Is Spam', 'Spam Probability', 'Safe Probability', 'Timestamp'],
      ...predictions.map(p => [
        p.prediction_id,
        `"${p.text.replace(/"/g, '""')}"`,
        p.is_spam ? 'Yes' : 'No',
        (p.spam_probability * 100).toFixed(2) + '%',
        (p.safe_probability * 100).toFixed(2) + '%',
        p.timestamp
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `shieldmail_predictions_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (!predictions || predictions.length === 0) {
    return (
      <div className="history-container">
        <div className="card">
          <h2>Prediction History</h2>
          <p className="no-data">No predictions yet. Make some predictions to see them here.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="history-container">
      <div className="history-header">
        <h2>Prediction History</h2>
        <div className="header-actions">
          <button onClick={onRefresh} className="refresh-btn" disabled={loading}>
            Refresh
          </button>
          <button onClick={onGenerateSampleData} className="generate-sample-btn" disabled={loading}>
            {loading ? 'Generating...' : 'Generate Sample Data'}
          </button>
          <button onClick={exportHistory} className="export-btn">
            Export CSV
          </button>
        </div>
      </div>

      {/* summary cards */}
      <div className="stats-grid">
        <div className="stat-card total">
          <h3>Total Predictions</h3>
          <div className="stat-value">{summaryStats.total}</div>
        </div>
        <div className="stat-card spam">
          <h3>Spam Detected</h3>
          <div className="stat-value">{summaryStats.spamCount}</div>
          {summaryStats.total > 0 && (
            <div className="stat-percentage">
              {((summaryStats.spamCount / summaryStats.total) * 100).toFixed(1)}%
            </div>
          )}
        </div>
        <div className="stat-card safe">
          <h3>Legitimate</h3>
          <div className="stat-value">{summaryStats.safeCount}</div>
          {summaryStats.total > 0 && (
            <div className="stat-percentage">
              {((summaryStats.safeCount / summaryStats.total) * 100).toFixed(1)}%
            </div>
          )}
        </div>
      </div>

      <div className="predictions-list">
        {predictions.map((prediction) => (
          <div 
            key={prediction.prediction_id} 
            className={`prediction-item ${prediction.is_spam ? 'spam' : 'safe'}`}
          >
            <div className="prediction-header">
              <div className="prediction-status">
                <span className={`status-badge ${prediction.is_spam ? 'spam-badge' : 'safe-badge'}`}>
                  {prediction.is_spam ? 'SPAM' : 'SAFE'}
                </span>
                <span className="prediction-id">
                  ID: {prediction.prediction_id.slice(0, 8)}...
                </span>
              </div>
              <button
                onClick={() => onDelete(prediction.prediction_id)}
                className="delete-btn"
                title="Delete prediction"
              >
                Delete
              </button>
            </div>

            <div className="prediction-text">
              {prediction.text}
            </div>

            <div className="prediction-details">
              <div className="detail-item">
                <span className="detail-label">Spam Probability:</span>
                <span className={`detail-value spam ${prediction.is_spam ? 'highlight' : ''}`}>
                  {(prediction.spam_probability * 100).toFixed(2)}%
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Safe Probability:</span>
                <span className={`detail-value safe ${!prediction.is_spam ? 'highlight' : ''}`}>
                  {(prediction.safe_probability * 100).toFixed(2)}%
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Timestamp:</span>
                <span className="detail-value">
                  {new Date(prediction.timestamp).toLocaleString()}
                </span>
              </div>
            </div>

            {prediction.feedback && (
              <div className="prediction-feedback">
                <span className="feedback-label">Feedback:</span>
                <span className={`feedback-value ${prediction.feedback}`}>
                  {prediction.feedback === 'correct' ? 'Correct' : 'Incorrect'}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="history-footer">
        <p>Showing {predictions.length} prediction{predictions.length !== 1 ? 's' : ''}</p>
      </div>
    </div>
  )
}

export default PredictionHistory

