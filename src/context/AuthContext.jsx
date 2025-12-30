import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const AuthContext = createContext(null);

const fallbackAuth = {
  user: null,
  loading: true,
  signup: () => null,
  login: () => null,
  logout: () => {},
  updateUser: () => {},
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  return ctx || fallbackAuth;
};

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('vg_user');
      if (storedUser) setUser(JSON.parse(storedUser));
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  const signup = (email, password, name) => {
    const newUser = {
      id: Date.now().toString(),
      email,
      name,
      createdAt: new Date().toISOString(),
      hasSeenTour: false,
    };

    const users = JSON.parse(localStorage.getItem('vg_users') || '[]');
    users.push({ ...newUser, password });

    localStorage.setItem('vg_users', JSON.stringify(users));
    localStorage.setItem('vg_user', JSON.stringify(newUser));
    setUser(newUser);
    return newUser;
  };

  const login = (email, password) => {
    const users = JSON.parse(localStorage.getItem('vg_users') || '[]');
    const foundUser = users.find(u => u.email === email && u.password === password);

    if (foundUser) {
      const { password: _pw, ...userWithoutPassword } = foundUser;
      localStorage.setItem('vg_user', JSON.stringify(userWithoutPassword));
      setUser(userWithoutPassword);
      return userWithoutPassword;
    }
    return null;
  };

  const logout = () => {
    localStorage.removeItem('vg_user');
    setUser(null);
  };

  const updateUser = (updates) => {
    setUser(prev => {
      const next = { ...(prev || {}), ...(updates || {}) };
      localStorage.setItem('vg_user', JSON.stringify(next));
      return next;
    });
  };

  const value = useMemo(
    () => ({ user, signup, login, logout, updateUser, loading }),
    [user, loading]
  );

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;