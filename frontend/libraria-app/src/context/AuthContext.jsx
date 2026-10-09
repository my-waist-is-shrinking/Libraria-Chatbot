import { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Load saved user so refreshing the page doesn't log you out
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('libraria-user');
    return saved ? JSON.parse(saved) : null;
  });

  // Save user to state + browser storage (null = logged out)
  const saveUser = (newUser) => {
    setUser(newUser);
    if (newUser) localStorage.setItem('libraria-user', JSON.stringify(newUser));
    else localStorage.removeItem('libraria-user');
  };

  // Log in as a user (fake for now, will call FastAPI later)
  const login = async (email, password) => {
    if (!email || !password) throw new Error('Please enter your email and password.');
    saveUser({ name: email.split('@')[0], email, role: 'user' });
  };

  // Log in as a guest (no account needed)
  const loginAsGuest = () => saveUser({ name: 'Guest', role: 'guest' });

  // Log out
  const logout = () => saveUser(null);

  return (
    <AuthContext.Provider value={{ user, login, loginAsGuest, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Shortcut so pages can write: const { user } = useAuth();
export const useAuth = () => useContext(AuthContext);