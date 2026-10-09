import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>      {/* enables pages/URLs */}
      <AuthProvider>     {/* shares the logged-in user */}
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);