import React, { createContext, useReducer, useContext, useEffect, ReactNode } from 'react';
import { generateCodeVerifier, generateCodeChallenge } from '../utils/pkce';

interface User {
  id: string;
  name: string;
  email?: string;
  [key: string]: any; 
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
  error: string | null;
  codeVerifier: string | null;
  authState: string | null;
}

type AuthAction = 
  | { type: 'LOGIN_INIT'; payload: { codeVerifier: string; authState: string; } }
  | { type: 'LOGIN_SUCCESS'; payload: { user: User; } }
  | { type: 'LOGOUT' }
  | { type: 'AUTH_ERROR'; payload: string }
  | { type: 'SET_LOADING' }
  | { type: 'CHECK_AUTH_COMPLETE'; payload: { isAuthenticated: boolean; user: User | null; } };

interface AuthContextValue extends AuthState {
  initiateLogin: () => Promise<void>;
  handleAuthCallback: (code: string, receivedState: string | null) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthContextProvider');
  }
  return context;
};

const AUTH_ACTIONS = {
  LOGIN_INIT: 'LOGIN_INIT' as const,
  LOGIN_SUCCESS: 'LOGIN_SUCCESS' as const,
  LOGOUT: 'LOGOUT' as const,
  AUTH_ERROR: 'AUTH_ERROR' as const,
  SET_LOADING: 'SET_LOADING' as const,
  CHECK_AUTH_COMPLETE: 'CHECK_AUTH_COMPLETE' as const
};

const initialAuthState: AuthState = {
  isAuthenticated: false,
  user: null,
  loading: true,
  error: null,
  codeVerifier: null,
  authState: null
};

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case AUTH_ACTIONS.LOGIN_INIT:
      return {
        ...state,
        codeVerifier: action.payload.codeVerifier,
        authState: action.payload.authState,
        loading: true
      };
    case AUTH_ACTIONS.LOGIN_SUCCESS:
      return {
        ...state,
        isAuthenticated: true,
        user: action.payload.user,
        loading: false,
        error: null,
        codeVerifier: null,
        authState: null
      };
    case AUTH_ACTIONS.LOGOUT:
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        loading: false,
        codeVerifier: null,
        authState: null
      };
    case AUTH_ACTIONS.AUTH_ERROR:
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        loading: false,
        error: action.payload,
        codeVerifier: null,
        authState: null
      };
    case AUTH_ACTIONS.SET_LOADING:
      return {
        ...state,
        loading: true
      };
    case AUTH_ACTIONS.CHECK_AUTH_COMPLETE:
      return {
        ...state,
        loading: false,
        isAuthenticated: action.payload.isAuthenticated,
        user: action.payload.user
      };
    default:
      return state;
  }
};

interface AuthContextProviderProps {
  children: ReactNode;
}

export const AuthContextProvider: React.FC<AuthContextProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialAuthState);
  
  useEffect(() => {
    const checkAuthStatus = async (): Promise<void> => {
      const token = localStorage.getItem('authToken');
      
      if (token) {
        try {
          console.log('hi')
          // Validate token or fetch user info
          const response = await fetch('http://localhost:4009/me', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (response.ok) {
            const userData: User = await response.json();
            dispatch({
              type: AUTH_ACTIONS.CHECK_AUTH_COMPLETE,
              payload: {
                isAuthenticated: true,
                user: userData
              }
            });
          } else {
            localStorage.removeItem('authToken');
            dispatch({
              type: AUTH_ACTIONS.CHECK_AUTH_COMPLETE,
              payload: {
                isAuthenticated: false,
                user: null
              }
            });
          }
        } catch (error) {
          console.error('Auth validation error:', error);
          localStorage.removeItem('authToken');
          dispatch({
            type: AUTH_ACTIONS.CHECK_AUTH_COMPLETE,
            payload: {
              isAuthenticated: false,
              user: null
            }
          });
        }
      } else {
        dispatch({
          type: AUTH_ACTIONS.CHECK_AUTH_COMPLETE,
          payload: {
            isAuthenticated: false,
            user: null
          }
        });
      }
    };
    
    checkAuthStatus();
  }, []);
  
  //! Just the example code, this logic should move to backend
  const initiateLogin = async (): Promise<void> => {
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    
    // Generate random state for CSRF protection
    const authState = Math.random().toString(36).substring(2, 15);
    
    dispatch({
      type: AUTH_ACTIONS.LOGIN_INIT,
      payload: {
        codeVerifier,
        authState
      }
    });
    
    //! Just the example code, this logic should move to backend
    const authUrl = new URL('https://auth.example.com/authorize');
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('client_id', 'YOUR_CLIENT_ID');
    authUrl.searchParams.append('redirect_uri', `${window.location.origin}/auth/callback`);
    authUrl.searchParams.append('code_challenge_method', 'S256');
    authUrl.searchParams.append('code_challenge', codeChallenge);
    authUrl.searchParams.append('state', authState);
    authUrl.searchParams.append('scope', 'openid profile email');
    
    window.location.href = authUrl.toString();
  };
  
  const handleAuthCallback = async (code: string, receivedState: string | null): Promise<boolean> => {
    dispatch({ type: AUTH_ACTIONS.SET_LOADING });
    
    if (receivedState !== state.authState) {
      dispatch({
        type: AUTH_ACTIONS.AUTH_ERROR,
        payload: 'Invalid state parameter'
      });
      return false;
    }
    
    try {
      //! Just the example code, this logic should move to backend
      const response = await fetch('https://api.your-backend.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          grant_type: 'authorization_code',
          client_id: 'YOUR_CLIENT_ID',
          code_verifier: state.codeVerifier,
          code: code,
          redirect_uri: `${window.location.origin}/auth/callback`
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to exchange code for token');
      }
      
      interface TokenResponse {
        access_token: string;
        refresh_token?: string;
        expires_in: number;
        token_type: string;
      }
      
      const data: TokenResponse = await response.json();
      
      localStorage.setItem('authToken', data.access_token);
      
      if (data.refresh_token) {
        localStorage.setItem('refreshToken', data.refresh_token);
      }
      
      const userResponse = await fetch('https://api.your-backend.com/me', {
        headers: {
          'Authorization': `Bearer ${data.access_token}`
        }
      });
      
      if (!userResponse.ok) {
        throw new Error('Failed to fetch user data');
      }
      
      const userData: User = await userResponse.json();
      
      dispatch({
        type: AUTH_ACTIONS.LOGIN_SUCCESS,
        payload: {
          user: userData
        }
      });
      
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
      console.error('Auth callback error:', error);

      dispatch({
        type: AUTH_ACTIONS.AUTH_ERROR,
        payload: errorMessage
      });
      
      return false;
    }
  };
  
  const logout = (): void => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    dispatch({ type: AUTH_ACTIONS.LOGOUT });
    
    // Optionally redirect to auth server logout endpoint
    // window.location.href = 'https://auth.example.com/logout';
  };
  
  const authValue: AuthContextValue = {
    ...state,
    initiateLogin,
    handleAuthCallback,
    logout
  };
  
  return (
    <AuthContext.Provider value={authValue}>
      {children}
    </AuthContext.Provider>
  );
};