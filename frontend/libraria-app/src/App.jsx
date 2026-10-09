import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import Chat from './components/Chat'; // change this path if your Chat.jsx is somewhere else

function App() {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Already logged in? Skip the login page */}
      <Route path="/login" element={user ? <Navigate to="/chat" /> : <LoginPage />} />

      {/* Not logged in? Go to login first */}
      <Route path="/chat" element={user ? <Chat /> : <Navigate to="/login" />} />

      {/* Any other URL: send to the right place */}
      <Route path="*" element={<Navigate to={user ? '/chat' : '/login'} />} />
    </Routes>
  );
}

export default App;