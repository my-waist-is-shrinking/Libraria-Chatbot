import { useEffect, useState } from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/solid';
import { ChatBubbleLeftEllipsisIcon } from '@heroicons/react/20/solid';

// Where the FastAPI backend runs (same as Chat.jsx)
const API_URL = 'http://localhost:8000';

// Right-side panel: title search that only shows REAL books from the database (no AI)
// Use it to check if a book the chatbot mentioned really exists
// onAsk = puts a question about a book into the chat box
const BookSearchPanel = ({ onAsk }) => {
  const [search, setSearch] = useState('');          // what's typed in the box
  const [results, setResults] = useState([]);        // books the backend found
  const [isSearching, setIsSearching] = useState(false); // true while waiting for the backend
  const [error, setError] = useState('');            // red message if the backend is off

  const text = search.trim();

  // Search every time the text changes, but wait 300 ms after the last key
  // (so typing a title sends 1 request, not 1 per letter)
  useEffect(() => {
    if (text.length < 2) {           // too short: show the tip instead
      setResults([]);
      setError('');
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        // encodeURIComponent = makes spaces and symbols safe inside a URL
        const response = await fetch(`${API_URL}/api/books?title=${encodeURIComponent(text)}`);
        if (!response.ok) throw new Error();
        setResults(await response.json());
        setError('');
      } catch {
        setError("Can't reach the server. Is the backend running?");
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);  // a new key was pressed: cancel the old timer
  }, [text]);

  return (
    // hidden lg:flex = hide on small screens, show on large screens (next to the chat)
    <aside className="hidden w-80 flex-none flex-col border-l border-gray-200 bg-gray-50 lg:flex">
      {/* Title + search box */}
      <div className="border-b border-gray-200 p-4">
        <h2 className="text-sm font-semibold text-gray-900">Find a book by title</h2>
        <p className="mb-3 text-xs text-gray-500">Check if a book is really in the CCS library.</p>
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Type the book title"
            className="h-9 w-full rounded-lg border-2 border-gray-300 bg-white pl-9 pr-3 text-xs focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          />
        </div>
      </div>

      {/* Results (scrolls on its own) */}
      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {text.length < 2 ? (
          <p className="text-center text-xs text-gray-400">
            Type the title of a book, e.g. <span className="font-medium">Python Crash Course</span>.
            If the chatbot named a book, type it here to see if the library has it.
          </p>
        ) : error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
        ) : isSearching && results.length === 0 ? (
          <p className="text-center text-xs text-gray-400">Searching...</p>
        ) : results.length === 0 ? (
          <p className="text-center text-xs text-gray-400">No book titled "{text}" in the library.</p>
        ) : (
          <>
            {/* How many were found (the backend shows at most 30) */}
            <p className="text-xs text-gray-500">
              {results.length === 30 ? '30+ books found, type more of the title' : `${results.length} book(s) found`}
            </p>

            {/* One card per book */}
            {results.map(b => (
              <div key={b.id} className="rounded-xl border border-gray-200 bg-white p-3">
                <p className="text-sm font-medium leading-snug text-gray-900">{b.title}</p>
                <p className="text-xs text-gray-500">
                  {b.author ?? b.publisher ?? 'Unknown author'}
                  {b.edition && ` · ${b.edition}`}
                </p>

                {/* Where to find it + availability */}
                <div className="mt-2 flex flex-wrap items-center gap-1">
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                    {b.format === 'E-Book' ? 'E-Book (online)' : b.call_number ?? 'Ask the librarian'}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      b.is_available ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {b.is_available ? 'Available' : 'Not available'}
                  </span>
                </div>

                {/* Course tags */}
                {b.courses.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {b.courses.map(c => (
                      <span key={c.id} title={c.name} className="rounded-full bg-fuchsia-50 px-2 py-0.5 text-xs text-fuchsia-700">
                        {c.code}
                      </span>
                    ))}
                  </div>
                )}

                {/* Put a question about this book into the chat box */}
                <button
                  onClick={() => onAsk(`Tell me about the book "${b.title}"`)}
                  className="mt-2 flex items-center gap-1 text-xs font-medium text-amber-700 hover:text-amber-900"
                >
                  <ChatBubbleLeftEllipsisIcon className="h-4 w-4" /> Ask Libraria about it
                </button>
              </div>
            ))}
          </>
        )}
      </div>
    </aside>
  );
};

export default BookSearchPanel;
