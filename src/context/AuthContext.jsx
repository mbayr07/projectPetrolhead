import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('vg_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const signup = (email, password, name) => {
    const newUser = {
      id: Date.now().toString(),
      email,
      name,
      createdAt: new Date().toISOString(),
      hasSeenTour: false
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
      const { password: _, ...userWithoutPassword } = foundUser;
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
    const updatedUser = { ...user, ...updates };
    localStorage.setItem('vg_user', JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  const value = {
    user,
    signup,
    login,
    logout,
    updateUser,
    loading
  };

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
}