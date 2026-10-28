import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import LoginPage from './pages/auth/LoginPage';
import SignUpPage from './pages/auth/SignUpPage';
import Chat from './components/chat/Chat'; // change this path if your Chat.jsx is somewhere else

function App() {
  const { user } = useAuth();

  // Librarians AND admins can manage books (same rule as the backend)
  const isStaff = user?.role === 'librarian' || user?.role === 'admin';

  return (
    <Routes>
      {/* Already logged in? Skip the login page */}
      <Route path="/login" element={user ? <Navigate to="/chat" /> : <LoginPage />} />

      {/* Sign up page (students). Logged in already? Go to chat */}
      <Route path="/signup" element={user ? <Navigate to="/chat" /> : <SignUpPage />} />

      {/* Not logged in? Go to login first */}
      <Route path="/chat" element={user ? <Chat /> : <Navigate to="/login" />} />

      {/* Admin page: admins only. Everyone else gets sent away */}
      <Route
        path="/admin"
        element={user?.role === 'admin' ? <Chat /> : <Navigate to={user ? '/chat' : '/login'} />}
      />

      {/* Library page: librarians + admins. Students/guests get sent back to chat */}
      <Route
        path="/library"
        element={isStaff ? <Chat /> : <Navigate to={user ? '/chat' : '/login'} />}
      />

      {/* Book search page (opened from the left sidebar) */}
      <Route path="/books" element={user ? <Chat /> : <Navigate to="/login" />} />

      {/* Discover books page */}
      <Route path="/books" element={user ? <Chat /> : <Navigate to="/login" />} />

      {/* Categories (courses) page */}
      <Route path="/categories" element={user ? <Chat /> : <Navigate to="/login" />} />

      {/* Any other URL: send to the right place */}
      <Route path="*" element={<Navigate to={user ? '/chat' : '/login'} />} />
    </Routes>
  );
}

export default App;
