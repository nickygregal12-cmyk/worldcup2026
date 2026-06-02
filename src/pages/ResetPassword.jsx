import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const navigate = useNavigate()

  const handleReset = async (e) => {
    e.preventDefault()
    setError('')
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    if (password !== confirm) { setError('Passwords do not match'); return }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) { setError(error.message) }
    else { setSuccess(true); setTimeout(() => navigate('/'), 2000) }
  }

  if (success) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: 'var(--bg-secondary)' }}>
      <div style={{ textAlign: 'center' }} className="fade-in">
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>✅</div>
        <h2 style={{ fontSize: '24px', fontWeight: '800' }}>Password updated!</h2>
        <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>Redirecting you home...</p>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', background: 'var(--bg-secondary)' }}>
      <div style={{ width: '100%', maxWidth: '400px' }} className="fade-in">
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔐</div>
          <h1 style={{ fontSize: '28px', fontWeight: '800' }}>Set new password</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '6px' }}>Choose a new password for your account</p>
        </div>

        <div className="card" style={{ padding: '28px' }}>
          <form onSubmit={handleReset}>
            <div className="form-group">
              <label className="label">New password</label>
              <input className="input" type="password" placeholder="At least 6 characters"
                value={password} onChange={e => setPassword(e.target.value)} required autoFocus />
            </div>
            <div className="form-group">
              <label className="label">Confirm password</label>
              <input className="input" type="password" placeholder="Same as above"
                value={confirm} onChange={e => setConfirm(e.target.value)} required />
            </div>
            {error && (
              <div style={{ padding: '10px 14px', background: 'var(--accent-red-light)', color: 'var(--accent-red)', borderRadius: 'var(--radius-md)', fontSize: '13px', marginBottom: '16px' }}>
                {error}
              </div>
            )}
            <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
              {loading ? <div className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }} /> : 'Update password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
