import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRightIcon, SparklesIcon } from '@heroicons/react/24/solid';
import { useAuth } from '../context/AuthContext';

// Bullet points on the right panel
const HIGHLIGHTS = [
  'Ask in plain words, get book matches',
  'Check if a book is available',
  'Get recommendations for your course',
];

const LoginPage = () => {
  const { login, loginAsGuest } = useAuth();
  const navigate = useNavigate(); // lets us change pages in code

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Log in with email + password
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await login(email, password);
      navigate('/chat');
    } catch (err) {
      setError(err.message); // show the error box
    } finally {
      setIsLoading(false);
    }
  };

  // Skip login and chat as a guest
  const handleGuest = () => {
    loginAsGuest();
    navigate('/chat');
  };

  return (
    // Exactly screen height (no scrollbar). Big screens: two columns (form | panel)
    <div className="h-screen overflow-hidden bg-white lg:grid lg:grid-cols-2">

      {/* ===== LEFT: form ===== */}
      <main className="flex h-full flex-col">
        {/* Logo */}
        <header className="px-6 py-4 sm:px-10">
          <span className="text-xl font-bold text-fuchsia-700">Libraria</span>
        </header>

        {/* Form, centered. max-w-xs keeps it compact */}
        <div className="flex flex-1 items-center justify-center px-6 py-4">
          <div className="w-full max-w-xs space-y-4">

            {/* Heading */}
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Welcome back</p>
              <h1 className="text-xl font-bold text-gray-900">
                Sign in to <em className="font-normal text-fuchsia-700">Libraria.</em>
              </h1>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              {/* Email */}
              <div className="space-y-1">
                <label htmlFor="email" className="text-[10px] font-medium uppercase tracking-wider text-gray-700">
                  Email
                </label>
                <input
                  id="email"
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
                <label htmlFor="password" className="text-[10px] font-medium uppercase tracking-wider text-gray-700">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="h-9 w-full rounded-lg border-2 border-gray-300 px-3 text-xs focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
              </div>

              {/* Error box (only shows if there's an error) */}
              {error && (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
                  {error}
                </p>
              )}

              {/* Log in button */}
              <button
                type="submit"
                disabled={isLoading}
                className="flex h-9 w-full items-center justify-center rounded-full bg-amber-600 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-50"
              >
                {isLoading ? 'Logging in...' : (
                  <>
                    Log in <ArrowRightIcon className="ml-2 h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            {/* "or" divider */}
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-gray-200" />
              <span className="text-xs uppercase tracking-wider text-gray-400">or</span>
              <div className="h-px flex-1 bg-gray-200" />
            </div>

            {/* Guest button */}
            <div className="space-y-2">
              <button
                onClick={handleGuest}
                className="h-9 w-full rounded-full border-2 border-gray-300 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                Continue as Guest
              </button>
              <p className="text-center text-xs text-gray-500">
                Guests can chat, but conversations aren't saved.
              </p>
            </div>

            {/* No account yet? Go to the sign up page */}
            <p className="text-center text-xs text-gray-500">
              No account yet?{' '}
              <Link to="/signup" className="font-medium text-fuchsia-700 hover:underline">
                Sign up
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <footer className="px-6 py-4 text-[11px] uppercase tracking-wider text-gray-400 sm:px-10">
          © {new Date().getFullYear()} Libraria
        </footer>
      </main>

      {/* ===== RIGHT: branded panel (big screens only) ===== */}
      <aside className="hidden h-full p-6 lg:block">
        <div className="relative flex h-full flex-col justify-center overflow-hidden rounded-3xl bg-fuchsia-950 p-12 text-white">
          {/* Glowing color blobs in the background */}
          <div className="absolute -right-20 -top-32 h-[460px] w-[460px] rounded-full bg-fuchsia-500/30 blur-[120px]" />
          <div className="absolute -bottom-20 -left-10 h-[320px] w-[420px] rounded-full bg-amber-400/20 blur-[140px]" />

          {/* Content (z-10 keeps it above the blobs) */}
          <div className="relative z-10 max-w-md space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 px-3 py-1 text-xs">
              <SparklesIcon className="h-3 w-3" />
              AI Book Assistant for CCS Students
            </span>

            <h2 className="text-5xl font-bold leading-tight">
              Find your next book <em className="font-normal text-amber-300">in seconds.</em>
            </h2>

            <ul className="space-y-3 pt-4">
              {HIGHLIGHTS.map((line) => (
                <li key={line} className="flex items-center gap-3 text-sm text-white/85">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-300" />
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </aside>
    </div>
  );
};

export default LoginPage;