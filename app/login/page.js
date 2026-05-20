'use client';

import { useState } from 'react';
import { Lock, Unlock, Eye, EyeOff, AlertCircle, ShieldAlert } from 'lucide-react';
import styles from './login.module.css';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password) {
      setError('Please enter the password');
      triggerShake();
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (response.ok) {
        // Successful login: Show premium transition screen, then redirect to chat
        setIsSuccess(true);
        setTimeout(() => {
          window.location.href = '/';
        }, 1500);
      } else {
        setError(data.error || 'Authentication failed');
        triggerShake();
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('An error occurred. Please try again.');
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => {
      setIsShaking(false);
    }, 500);
  };

  return (
    <div className={styles.container}>
      {isSuccess ? (
        <div className={styles.successCard}>
          <div className={styles.successLogoWrapper}>
            <div className={styles.pulseRing1}></div>
            <div className={styles.pulseRing2}></div>
            <div className={styles.successIconCircle}>
              <Unlock size={36} strokeWidth={2.2} className={styles.unlockIcon} />
            </div>
          </div>

          <h1 className={styles.successTitle}>Access Granted</h1>
          <p className={styles.successSubtitle}>
            Decrypting database and preparing chat workspace...
          </p>

          <div className={styles.progressBarWrapper}>
            <div className={styles.progressBar}></div>
          </div>
        </div>
      ) : (
        <div className={`${styles.card} ${isShaking ? styles.shake : ''}`}>
          <div className={styles.logoWrapper}>
            <div className={styles.iconCircle}>
              <Lock size={36} strokeWidth={2.2} />
            </div>
          </div>

          <h1 className={styles.title}>Secure Chat Room</h1>
          <p className={styles.subtitle}>
            This archive is encrypted for privacy. Please enter the passcode to access the messages and media files.
          </p>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.inputGroup}>
              <input
                type={showPassword ? 'text' : 'password'}
                className={styles.input}
                placeholder="Enter passcode"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                autoFocus
              />
              <button
                type="button"
                className={styles.toggleBtn}
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            {error && (
              <div className={styles.errorText}>
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <button type="submit" className={styles.button} disabled={loading}>
              {loading ? <div className={styles.spinner} /> : 'Unlock Chat'}
            </button>
          </form>

          <div className={styles.footer}>
            <span>Protected Area • End-to-End Encrypted Archive</span>
          </div>
        </div>
      )}
    </div>
  );
}
