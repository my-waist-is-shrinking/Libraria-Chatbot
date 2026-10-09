import { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/solid';
import { useAuth } from '../context/AuthContext';

// Login popup shown on top of the chat (the chat stays underneath)
// Props: onClose = function that hides the popup
const LoginModal = ({ onClose }) => {
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Log in, then close the popup (no page change)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await login(email, password);
      onClose();
    } catch (err) {
      setError(err.message); // show the error box
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // Dark see-through background. Clicking it closes the popup
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      {/* Popup box. stopPropagation = clicking inside doesn't close it */}
      <div
        className="relative w-full max-w-xs rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* X button (top right) */}
        <button onClick={onClose} className="absolute right-3 top-3 text-gray-400 hover:text-gray-600">
          <XMarkIcon className="h-5 w-5" />
        </button>

        {/* Heading */}
        <h2 className="text-xl font-bold text-gray-900">
          Sign in to <em className="font-normal text-fuchsia-700">Libraria.</em>
        </h2>
        <p className="mt-1 text-xs text-gray-500">Your current chat will be kept.</p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-3">
          {/* Email */}
          <div className="space-y-1">
            <label htmlFor="modal-email" className="text-[10px] font-medium uppercase tracking-wider text-gray-700">
              Email
            </label>
            <input
              id="modal-email"
              type="email"
              placeholder="you@school.edu.ph"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              className="h-9 w-full rounded-lg border-2 border-gray-300 px-3 text-xs focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
          </div>

          {/* Password */}
          <div className="space-y-1">
            <label htmlFor="modal-password" className="text-[10px] font-medium uppercase tracking-wider text-gray-700">
              Password
            </label>
            <input
              id="modal-password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              className="h-9 w-full rounded-lg border-2 border-gray-300 px-3 text-xs focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
          </div>

          {/* Error box */}
          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
              {error}
            </p>
          )}

          {/* Log in button */}
          <button
            type="submit"
            disabled={isLoading}
            className="h-9 w-full rounded-full bg-amber-600 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-50"
          >
            {isLoading ? 'Logging in...' : 'Log in'}
          </button>
        </form>

        {/* Stay as guest = just close */}
        <button
          onClick={onClose}
          className="mt-2 h-9 w-full rounded-full border-2 border-gray-300 text-xs font-medium text-gray-700 hover:bg-gray-50"
        >
          Continue as Guest
        </button>
      </div>
    </div>
  );
};

export default LoginModal;