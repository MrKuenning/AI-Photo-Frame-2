import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import './PassphraseModal.css';

export default function PassphraseModal({ actionName, title = "Passphrase Required", description = "This action is locked. Please enter the passphrase to proceed.", onClose, onSuccess }) {
  const [passphrase, setPassphrase] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { unlock, reloadStatus } = useAuth();
  
  const inputRef = useRef(null);

  useEffect(() => {
    // Focus the input when the modal opens
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!passphrase.trim()) return;
    
    setLoading(true);
    setError('');
    
    try {
      const success = await unlock(actionName, passphrase);
      if (success) {
        await reloadStatus(); // Refresh global auth state
        onSuccess(); // Trigger callback
      } else {
        setError('Invalid passphrase. Please try again.');
        setPassphrase('');
        if (inputRef.current) inputRef.current.focus();
      }
    } catch (err) {
      setError(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 2000 }}>
      <div className="passphrase-modal-content glass" onClick={e => e.stopPropagation()}>
        <div className="passphrase-modal-body">
          <h3>🔒 {title}</h3>
          <p>{description}</p>
          
          <form onSubmit={handleSubmit}>
            <input
              ref={inputRef}
              type="password"
              className="input"
              placeholder="Enter Passphrase"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              disabled={loading}
            />
            {error && <small style={{ color: 'var(--danger)', display: 'block', marginTop: '0.5rem' }}>{error}</small>}
            
            <div className="passphrase-actions">
              <button type="button" className="btn btn-ghost" onClick={onClose} disabled={loading}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={loading || !passphrase.trim()}>
                {loading ? 'Unlocking...' : 'Unlock'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
