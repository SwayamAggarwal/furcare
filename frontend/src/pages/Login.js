import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { login } from '../api';
import './login.css';

export default function Login({ onClose, modal = false }) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!/^[0-9]+$/.test(String(phone).trim())) return setError('Enter valid mobile number');
    if (!password || password.length < 6) return setError('Password must be at least 6 chars');
    try {
      const res = await login({ phone, password });
      if (res.data && res.data.success) {
        setShowSuccess(true);
        setTimeout(() => {
          if (modal && onClose) onClose();
          // persist logged-in user for dashboard access
          try { localStorage.setItem('furcare_user', JSON.stringify(res.data.user)); } catch(e) {}
          navigate('/dashboard');
        }, 800);
      } else {
        setError('Invalid credentials');
      }
    } catch (err) {
      console.error(err?.response?.data || err.message);
      setError(err?.response?.data?.error || 'Login failed');
    }
  };

  const content = (
    <div className={modal ? 'login-overlay' : 'login-page'}>
      {modal ? (
        <>
          <div className="login-backdrop" onClick={onClose} />
          <div className="modal">
            <div className="login-card">
              <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
              <div className="brand" style={{ marginBottom: 12 }}>
                <div className="brand-logo" aria-hidden>
                  <svg width="56" height="56" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="6.2" cy="7.2" r="1.9" fill="white" />
                    <circle cx="10" cy="4.6" r="1.9" fill="white" />
                    <circle cx="14.8" cy="7.2" r="1.9" fill="white" />
                    <path d="M12 9.2c-3 0-5.6 2.1-5.6 4.7S9 18.6 12 18.6s5.6-2.1 5.6-4.7S15 9.2 12 9.2z" fill="white" />
                  </svg>
                </div>
                <div className="brand-text">
                  <div className="brand-name">FurCare</div>
                  <div className="brand-tag">YOUR PET'S HAPPY PLACE</div>
                </div>
              </div>

              <h2 className="login-title">Welcome back! 🐶</h2>
              <p className="login-sub">Enter registered mobile number and password to continue</p>
              <form onSubmit={handleSubmit} className="login-form">
                <label>Mobile Number</label>
                <input name="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. 1234567890" />
                <label>Password</label>
                <input name="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" />
                {error && <div className="login-error">{error}</div>}
                <button className="login-button" type="submit">Continue</button>
              </form>

              {showSuccess && (
                <div className="login-toast">FurCare — Login successful ✓</div>
              )}
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="login-card">
            <div className="brand">
              <div className="brand-logo" aria-hidden>
                <svg width="56" height="56" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="6.2" cy="7.2" r="1.9" fill="white" />
                  <circle cx="10" cy="4.6" r="1.9" fill="white" />
                  <circle cx="14.8" cy="7.2" r="1.9" fill="white" />
                  <path d="M12 9.2c-3 0-5.6 2.1-5.6 4.7S9 18.6 12 18.6s5.6-2.1 5.6-4.7S15 9.2 12 9.2z" fill="white" />
                </svg>
              </div>
              <div className="brand-text">
                <div className="brand-name">FurCare</div>
                <div className="brand-tag">YOUR PET'S HAPPY PLACE</div>
              </div>
            </div>

            <h2 className="login-title">Welcome back! 🐶</h2>
            <p className="login-sub">Enter registered mobile number and password to continue</p>
            <form onSubmit={handleSubmit} className="login-form">
              <label>Mobile Number</label>
              <input name="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. 1234567890" />
              <label>Password</label>
              <input name="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" />
              {error && <div className="login-error">{error}</div>}
              <button className="login-button" type="submit">Continue</button>
            </form>
          </div>

          {showSuccess && (
            <div className="login-toast">Login successful ✓</div>
          )}
        </>
      )}
    </div>
  );

  if (modal && typeof document !== 'undefined') {
    return createPortal(content, document.body);
  }

  return content;
}
