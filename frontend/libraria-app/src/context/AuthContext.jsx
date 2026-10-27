import { createContext, useContext, useState } from 'react';

// Where the FastAPI backend runs
const API_URL = 'http://localhost:8000';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Load saved user so refreshing the page doesn't log you out
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('libraria-user');
    if (!saved) return null;
    const parsed = JSON.parse(saved);
    // Old fake logins have no token, so make them log in again
    if (parsed.role !== 'guest' && !parsed.token) return null;
    return parsed;
  });

  // Save user to state + browser storage (null = logged out)
  const saveUser = (newUser) => {
    setUser(newUser);
    if (newUser) localStorage.setItem('libraria-user', JSON.stringify(newUser));
    else localStorage.removeItem('libraria-user');
  };

  // Send login/sign-up data to FastAPI, then save the user it sends back
  const sendToBackend = async (path, body) => {
    let response;
    try {
      response = await fetch(`${API_URL}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch {
      // fetch fails when the backend isn't running
      throw new Error("Can't reach the server. Is the backend running?");
    }

    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || 'Something went wrong.'); // e.g. "Wrong email or password."

    // Keep what the app needs. The token proves who we are on later requests
    saveUser({
      id: data.user.id,
      name: data.user.full_name,
      email: data.user.email,
      role: data.user.role,        // user / librarian / admin
      token: data.access_token,
    });
  };

  // Log in for real: ask FastAPI to check the email + password
  const login = async (email, password) => {
    if (!email || !password) throw new Error('Please enter your email and password.');
    await sendToBackend('/api/auth/login', { email, password });
  };

  // Sign up (students only). Logs in right away if it works
  const register = async (fullName, email, password) => {
    if (!fullName || !email || !password) throw new Error('Please fill in all fields.');
    await sendToBackend('/api/auth/register', { full_name: fullName, email, password });
  };

  // Call FastAPI as the logged-in user (sends the token so it knows who we are)
  const authFetch = async (path, method = 'GET', body) => {
    let response;
    try {
      response = await fetch(`${API_URL}${path}`, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user?.token}` },
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch {
      throw new Error("Can't reach the server. Is the backend running?");
    }

    // 204 = success with no body (e.g. delete), so there's no JSON to read
    if (response.status === 204) return null;

    const data = await response.json();
    // 401 = token expired or bad, so log out and ask to log in again
    if (response.status === 401) {
      saveUser(null);
      throw new Error('Your session expired. Please log in again.');
    }
    if (!response.ok) throw new Error(typeof data.detail === 'string' ? data.detail : 'Something went wrong.');
    return data;
  };

  // Profile tab: change your name (email stays the same, it's your login)
  const updateProfile = async (fullName) => {
    const updated = await authFetch('/api/auth/me', 'PATCH', { full_name: fullName });
    saveUser({ ...user, name: updated.full_name }); // keep everything (token too), only swap the name
  };

  // Settings tab: change your password (backend checks the current one first)
  const changePassword = async (currentPassword, newPassword) => {
    await authFetch('/api/auth/change-password', 'POST', {
      current_password: currentPassword,
      new_password: newPassword,
    });
  };

  // Log in as a guest (no account needed)
  const loginAsGuest = () => saveUser({ name: 'Guest', role: 'guest' });

  // Log out
  const logout = () => saveUser(null);

  return (
    <AuthContext.Provider value={{ user, login, register, authFetch, updateProfile, changePassword, loginAsGuest, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Shortcut so pages can write: const { user } = useAuth();
export const useAuth = () => useContext(AuthContext);