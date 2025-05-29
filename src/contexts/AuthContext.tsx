import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { apiService } from '../services/apiService';

interface User {
  id: number;
  email: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (username: string, email: string, password: string, displayName?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  // Load user from token on app start
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('authToken');
      if (token) {
        try {          // Set the token in apiService
          apiService.setToken(token);
            // Try to get current user
          const response = await apiService.getMe();
          if (response.success && response.data) {
            // Backend returns { user: {...} }
            setUser(response.data.user);
          } else {
            // Invalid token, remove it
            localStorage.removeItem('authToken');
            apiService.setToken(null);
          }
        } catch (error) {
          console.error('Failed to initialize auth:', error);
          localStorage.removeItem('authToken');
          apiService.setToken(null);
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);
  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      const response = await apiService.login(email, password);
      
      if (response.success && response.data) {
        // Backend returns { user, token, message } directly
        const { token, user: userData } = response.data;
          // Store token
        localStorage.setItem('authToken', token);
        apiService.setToken(token);
        
        // Set user
        setUser(userData);
        
        return { success: true };
      } else {
        return { success: false, error: response.error || 'Login failed' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Network error or server unavailable' };
    } finally {
      setIsLoading(false);
    }
  };  const register = async (
    username: string, 
    email: string, 
    password: string, 
    displayName?: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      const response = await apiService.register(username, email, password, displayName);
      
      if (response.success && response.data) {
        // Backend returns { user, token, message } directly
        const { token, user: userData } = response.data;
          // Store token
        localStorage.setItem('authToken', token);
        apiService.setToken(token);
        
        // Set user
        setUser(userData);
        
        return { success: true };
      } else {
        return { success: false, error: response.error || 'Registration failed' };
      }
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: 'Network error or server unavailable' };
    } finally {
      setIsLoading(false);
    }
  };
  const logout = () => {
    localStorage.removeItem('authToken');
    apiService.setToken(null);
    setUser(null);
    
    // Call logout endpoint to invalidate token on server
    apiService.logout().catch(error => {
      console.error('Logout error:', error);
    });
  };

  const refreshUser = async () => {
    try {
      const response = await apiService.getMe();
      if (response.success && response.data) {
        setUser(response.data);
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
