import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { authAPI } from '@/services/api';

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: 'customer' | 'admin';
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  postalCode?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: { email: string; password: string; firstName?: string; lastName?: string; phone?: string }) => Promise<void>;
  logout: () => void;
  updateProfile: (profileData: Record<string, unknown>) => Promise<void>;
  changePassword: (passwords: { currentPassword: string; newPassword: string }) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if we are authenticated on mount
    refreshUser();
  }, []);

  const refreshUser = async () => {
    try {
      const data = await authAPI.getMe();
      setUser(data.user);
    } catch (error) {
      // Don't log error for 401 as it's expected when not logged in
      if (error instanceof Error && !error.message.includes('401')) {
        console.error('Failed to refresh user:', error);
      }
      localStorage.removeItem('token'); // Clean up old token if exists
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const data = await authAPI.login({ email, password });
    // Still set token for potential legacy/other uses, but primarily using cookies now
    localStorage.setItem('token', data.token);
    setUser(data.user);
  };

  const register = async (userData: { email: string; password: string; firstName?: string; lastName?: string; phone?: string }) => {
    const data = await authAPI.register(userData);
    localStorage.setItem('token', data.token);
    setUser(data.user);
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      setUser(null);
    }
  };

  const updateProfile = async (profileData: Record<string, unknown>) => {
    const data = await authAPI.updateProfile(profileData);
    setUser(data.user);
  };

  const changePassword = async (passwords: { currentPassword: string; newPassword: string }) => {
    await authAPI.changePassword(passwords);
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
