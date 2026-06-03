import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('WC26 Error:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh', background: '#f8f9fa',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '24px', textAlign: 'center',
        }}>
          <div style={{
            background: 'white', borderRadius: '16px',
            padding: '40px 32px', maxWidth: '360px', width: '100%',
            boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
          }}>
            <div style={{ fontSize: '56px', marginBottom: '16px' }}>⚽</div>
            <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#003087', marginBottom: '8px' }}>
              Something went wrong
            </h1>
            <p style={{ fontSize: '14px', color: '#636363', lineHeight: '1.6', marginBottom: '24px' }}>
              The app hit an unexpected error. Your predictions are safe — just refresh to continue.
            </p>
            <div style={{
              background: '#e8eef8', borderRadius: '10px',
              padding: '10px 14px', fontSize: '12px', color: '#003087',
              fontWeight: '600', marginBottom: '20px', fontFamily: 'monospace',
              textAlign: 'left', wordBreak: 'break-word',
            }}>
              {this.state.error?.message || 'Unknown error'}
            </div>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: '#003087', color: 'white', border: 'none',
                padding: '12px 28px', borderRadius: '10px',
                fontSize: '14px', fontWeight: '700', cursor: 'pointer',
                width: '100%',
              }}
            >
              Refresh the app
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
