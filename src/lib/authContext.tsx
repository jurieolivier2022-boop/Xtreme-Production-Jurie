import React, { createContext, useContext, useState } from 'react';

interface AuthContextType {
  user: any;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user] = useState<any>({
    uid: 'admin-user',
    email: 'admin@example.com',
    displayName: 'Admin User',
    emailVerified: true
  });
  const [loading] = useState(false);

  const login = async () => {
    // No-op
  };

  const logout = async () => {
    // No-op
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
