import React, { useState } from 'react'
import './EmailInputForm.css'

const EmailInputForm = ({ onPredict, loading, error }) => {
  const [text, setText] = useState('')
  const [validationError, setValidationError] = useState('')

  const validateInput = (value) => {
    if (!value || !value.trim()) {
      return 'Email text cannot be empty'
    }
    if (value.length > 50000) {
      return 'Email text must be less than 50,000 characters'
    }
    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setValidationError('')

    const validation = validateInput(text)
    if (validation) {
      setValidationError(validation)
      return
    }

    await onPredict(text)
  }

  const handleChange = (e) => {
    const value = e.target.value
    setText(value)
    setValidationError('')
  }

  const exampleEmails = [
    {
      label: 'Spam Example',
      text: 'WINNER!! You have been selected for a $1000 prize! Click here now: http://spam-link.com'
    },
    {
      label: 'Legitimate Example',
      text: 'Hi, I wanted to follow up on our meeting yesterday. Please let me know if you have any questions.'
    }
  ]

  const loadExample = (exampleText) => {
    setText(exampleText)
    setValidationError('')
  }

  return (
    <div className="email-input-form-container">
      <div className="card">
        <h2>Email Spam Detection</h2>
        <p className="subtitle">Enter email text to analyze for spam</p>

        <form onSubmit={handleSubmit} className="form">
          <div className="form-group">
            <label htmlFor="email-text">Email Text</label>
            <textarea
              id="email-text"
              value={text}
              onChange={handleChange}
              placeholder="Paste or type the email text here..."
              rows={10}
              className={validationError ? 'error' : ''}
              disabled={loading}
            />
            <div className="char-count">
              {text.length} / 50,000 characters
            </div>
            {validationError && (
              <div className="error-message">{validationError}</div>
            )}
          </div>

          <div className="example-emails">
            <p>Quick Examples:</p>
            <div className="example-buttons">
              {exampleEmails.map((example, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => loadExample(example.text)}
                  className="example-btn"
                  disabled={loading}
                >
                  {example.label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="error-message api-error">{error}</div>
          )}

          <button
            type="submit"
            className="submit-btn"
            disabled={loading || !text.trim()}
          >
            {loading ? 'Analyzing...' : 'Analyze Email'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default EmailInputForm

