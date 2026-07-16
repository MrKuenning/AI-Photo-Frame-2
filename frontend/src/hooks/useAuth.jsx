import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { fetchAuthStatus, unlockAction } from '../utils/api';
import PassphraseModal from '../components/PassphraseModal/PassphraseModal';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [authStatus, setAuthStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [promptAction, setPromptAction] = useState(null);
  const [pendingCallback, setPendingCallback] = useState(null);

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

  const requireUnlock = (action, isRequired, callback) => {
    if (isRequired) {
       setPromptAction(action);
       setPendingCallback(() => callback);
    } else {
       callback();
    }
  };

  const handlePassphraseSuccess = () => {
     setPromptAction(null);
     if (pendingCallback) {
        pendingCallback();
        setPendingCallback(null);
     }
  };

  return (
    <AuthContext.Provider value={{ authStatus, loading, unlock, reloadStatus: loadStatus, requireUnlock }}>
      {children}
      {promptAction && (
        <PassphraseModal 
          actionName={promptAction}
          title={`${promptAction.charAt(0).toUpperCase() + promptAction.slice(1).replace('_', ' ')} Locked`}
          description={`Enter the passphrase to unlock this action.`}
          onClose={() => { setPromptAction(null); setPendingCallback(null); }}
          onSuccess={handlePassphraseSuccess}
        />
      )}
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
