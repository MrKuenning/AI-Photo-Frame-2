import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { fetchAuthStatus, unlockAction } from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [authStatus, setAuthStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadStatus = useCallback(async () => {
    try {
      const status = await fetchAuthStatus();
      setAuthStatus(status);
    } catch (err) {
      console.error('Failed to load auth status:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const unlock = async (action, passphrase) => {
    const res = await unlockAction(action, passphrase);
    if (res.success) {
      await loadStatus();
      return true;
    }
    throw new Error(res.error || 'Unlock failed');
  };

  return (
    <AuthContext.Provider value={{ authStatus, loading, unlock, reloadStatus: loadStatus }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
