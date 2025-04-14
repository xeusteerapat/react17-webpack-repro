import React, { useEffect, useState } from 'react';
import { useLocation, useHistory } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const AuthCallback: React.FC = () => {
  const location = useLocation();
  const history = useHistory();
  const { handleAuthCallback, loading, error } = useAuth();
  const [localError, setLocalError] = useState<string | null>(null);
  
  useEffect(() => {
    const processAuth = async (): Promise<void> => {
      const params = new URLSearchParams(location.search);
      const code = params.get('code');
      const state = params.get('state');
      
      if (!code) {
        setLocalError('Authorization code not found in the URL');
        return;
      }
      
      const success = await handleAuthCallback(code, state);
      
      if (success) {
        history.replace('/dashboard');
      }
    };
    
    processAuth();
  }, [location, handleAuthCallback, history]);
  
  if (loading) {
    return <div>Processing authentication, please wait...</div>;
  }
  
  if (error || localError) {
    return (
      <div>
        <h2>Authentication Error</h2>
        <p>{error || localError}</p>
        <button onClick={() => history.replace('/login')}>
          Return to Login
        </button>
      </div>
    );
  }
  
  return <div>Completing authentication...</div>;
};

export default AuthCallback;