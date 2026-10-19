import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

export interface User {
  id: number;
  kullanici_adi: string;
  rol: 'admin' | 'cashier' | 'washer';
  ilkgiris_sifre_degistir: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLocked: boolean;
  login: (username: string, passwordOrPin: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  unlock: (passwordOrPin: string) => Promise<{ success: boolean; error?: string }>;
  changePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
  canAccess: (module: 'dashboard' | 'work_orders' | 'customers' | 'services' | 'inventory' | 'finance' | 'reports' | 'settings') => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 dakika (NFR-07)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);

  const resetInactivityTimer = () => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    if (user && !isLocked) {
      inactivityTimerRef.current = setTimeout(() => {
        setIsLocked(true);
      }, INACTIVITY_TIMEOUT_MS);
    }
  };

  useEffect(() => {
    const handleActivity = () => {
      resetInactivityTimer();
    };

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('click', handleActivity);

    resetInactivityTimer();

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    };
  }, [user, isLocked]);

  const login = async (username: string, passwordOrPin: string) => {
    try {
      if (window.electronAPI) {
        const res = await window.electronAPI.invoke('auth:login', { username, password: passwordOrPin });
        if (res.success && res.user) {
          setUser(res.user);
          setIsLocked(false);
          return { success: true };
        }
        return { success: false, error: res.error || 'Giriş başarısız.' };
      } else {
        // Mock fallback
        setUser({ id: 1, kullanici_adi: username, rol: username === 'admin' ? 'admin' : 'cashier', ilkgiris_sifre_degistir: false });
        return { success: true };
      }
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const logout = () => {
    setUser(null);
    setIsLocked(false);
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
  };

  const unlock = async (passwordOrPin: string) => {
    if (!user) return { success: false, error: 'Oturum bulunamadı.' };
    return login(user.kullanici_adi, passwordOrPin);
  };

  const changePassword = async (newPassword: string) => {
    if (!user) return { success: false, error: 'Oturum bulunamadı.' };
    try {
      if (window.electronAPI) {
        const res = await window.electronAPI.invoke('auth:changePassword', { userId: user.id, newPassword });
        if (res.success) {
          setUser({ ...user, ilkgiris_sifre_degistir: false });
          return { success: true };
        }
        return { success: false, error: res.error };
      }
      setUser({ ...user, ilkgiris_sifre_degistir: false });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const canAccess = (module: string): boolean => {
    if (!user) return false;
    if (user.rol === 'admin') return true;

    // Kasa Rolü (Gider, Finans ve Rapor göremez)
    if (user.rol === 'cashier') {
      if (module === 'finance' || module === 'reports') return false;
      return true;
    }

    // Yıkama Personeli
    if (user.rol === 'washer') {
      return module === 'dashboard' || module === 'work_orders';
    }

    return false;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLocked,
        login,
        logout,
        unlock,
        changePassword,
        canAccess,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
