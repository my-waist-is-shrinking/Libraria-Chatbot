import { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/solid';
import { useAuth } from '../../context/AuthContext';

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
        className="relative w-full max-w-xs rounded-2xl bg-white p-6 shadow-2xl border border-gray-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* X button (top right) */}
        <button onClick={onClose} className="absolute right-4 top-4 rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition">
          <XMarkIcon className="h-5 w-5" />
        </button>

        {/* Heading */}
        <h2 className="text-xl font-bold text-[#251E36]">
          Sign in to <span className="font-semibold text-[#4E426D]">Libraria.</span>
        </h2>
        <p className="mt-1 text-xs text-gray-500">Your current chat will be kept.</p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-3.5">
          {/* Email */}
          <div className="space-y-1.5">
            <label htmlFor="modal-email" className="text-[10px] font-semibold uppercase tracking-wider text-[#8E8EA0]">
              Email
            </label>
            <input
              id="modal-email"
              type="email"
              placeholder="you@school.edu.ph"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              className="h-10 w-full rounded-xl border border-gray-200 px-3 text-xs text-[#251E36] focus:border-[#4E426D] focus:outline-none focus:ring-2 focus:ring-[#4E426D]/20 transition placeholder:text-gray-400"
            />
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label htmlFor="modal-password" className="text-[10px] font-semibold uppercase tracking-wider text-[#8E8EA0]">
              Password
            </label>
            <input
              id="modal-password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              className="h-10 w-full rounded-xl border border-gray-200 px-3 text-xs text-[#251E36] focus:border-[#4E426D] focus:outline-none focus:ring-2 focus:ring-[#4E426D]/20 transition placeholder:text-gray-400"
            />
          </div>

          {/* Error box */}
          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
              {error}
            </p>
          )}

          {/* Log in button */}
          <button
            type="submit"
            disabled={isLoading}
            className="h-10 w-full rounded-xl bg-[#4E426D] text-xs font-semibold text-white shadow-xs transition hover:bg-[#3E3457] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Logging in...' : 'Log in'}
          </button>
        </form>

        {/* Stay as guest = just close */}
        <button
          onClick={onClose}
          className="mt-2.5 h-10 w-full rounded-xl border border-gray-200 text-xs font-semibold text-[#251E36] hover:bg-gray-50 transition"
        >
          Continue as Guest
        </button>
      </div>
    </div>
  );
};

export default LoginModal;
