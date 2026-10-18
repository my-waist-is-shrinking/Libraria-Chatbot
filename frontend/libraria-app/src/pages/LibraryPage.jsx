import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeftIcon, ArrowPathIcon, ArrowUpTrayIcon, MagnifyingGlassIcon, PlusIcon } from '@heroicons/react/24/solid';
import { useAuth } from '../context/AuthContext';
import BookForm from '../components/BookForm';
import CoursesPanel from '../components/CoursesPanel';

// Shared styles (same look as the admin page)
const INPUT = 'h-9 rounded-lg border-2 border-gray-300 px-3 text-xs focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50';

const LibraryPage = () => {
  const { user, authFetch } = useAuth();

  const [books, setBooks] = useState([]);            // every book from the backend
  const [courses, setCourses] = useState([]);        // every course from the backend
  const [isLoading, setIsLoading] = useState(true);  // true while loading
  const [isIndexing, setIsIndexing] = useState(false); // true while "Update AI index" runs
  const [isImporting, setIsImporting] = useState(false); // true while a CSV is being imported
  const fileInput = useRef(null);                     // the hidden "choose file" box
  const [message, setMessage] = useState({ type: '', text: '' }); // green/red box at the top
  const [tab, setTab] = useState('books');           // 'books' or 'courses'
  const [formBook, setFormBook] = useState(undefined); // undefined = popup closed, null = Add, a book = Edit

  // Search + filters (all done here in the page, no backend needed)
  const [search, setSearch] = useState('');
  const [courseFilter, setCourseFilter] = useState('');  // '' = all courses
  const [statusFilter, setStatusFilter] = useState('');  // '', 'available', 'unavailable', 'needs-ai'

  // Show a green (success) or red (error) message
  const showMessage = (type, text) => setMessage({ type, text });

  // ===== LOAD books + courses =====
  const loadAll = async () => {
    setIsLoading(true);
    try {
      // Ask for both at the same time (faster than one after the other)
      const [bookList, courseList] = await Promise.all([
        authFetch('/api/library/books', 'GET'),
        authFetch('/api/library/courses', 'GET'),
      ]);
      setBooks(bookList);
      setCourses(courseList);
    } catch (err) {
      showMessage('error', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Runs once when the page opens
  useEffect(() => {
    loadAll();
  }, []);

  // Put one updated book back into the list (so the table refreshes without reloading everything)
  const replaceBook = (updated) => setBooks(prev => prev.map(b => (b.id === updated.id ? updated : b)));

  // ===== STATS for the cards at the top =====
  const stats = [
    { label: 'Total books', value: books.length },
    { label: 'Total copies', value: books.reduce((sum, b) => sum + b.copies, 0) }, // adds up every book's copies
    { label: 'Available', value: books.filter(b => b.is_available).length },
    { label: 'E-Books', value: books.filter(b => b.format === 'E-Book').length },
    { label: 'No course', value: books.filter(b => b.courses.length === 0).length },
    { label: 'Needs AI update', value: books.filter(b => !b.is_indexed).length },
  ];
  const needsAiCount = books.filter(b => !b.is_indexed).length;

  // ===== SEARCH + FILTER =====
  const text = search.trim().toLowerCase();
  const shownBooks = books.filter(b => {
    // Search: title, author, or call number contains what was typed
    const matchesSearch =
      !text ||
      b.title.toLowerCase().includes(text) ||
      (b.author ?? '').toLowerCase().includes(text) ||
      (b.call_number ?? '').toLowerCase().includes(text);

    // Course dropdown
    const matchesCourse = !courseFilter || b.courses.some(c => String(c.id) === courseFilter);

    // Status dropdown
    const matchesStatus =
      !statusFilter ||
      (statusFilter === 'available' && b.is_available) ||
      (statusFilter === 'unavailable' && !b.is_available) ||
      (statusFilter === 'needs-ai' && !b.is_indexed);

    return matchesSearch && matchesCourse && matchesStatus;
  });

  // ===== ADD / EDIT (called by the BookForm popup) =====
  const saveBook = async (data) => {
    if (formBook) {
      // Editing an existing book
      replaceBook(await authFetch(`/api/library/books/${formBook.id}`, 'PATCH', data));
      showMessage('success', `"${data.title}" saved.`);
    } else {
      // Adding a new book
      const created = await authFetch('/api/library/books', 'POST', data);
      setBooks(prev => [...prev, created]);   // newest at the bottom (sorted by id)
      showMessage('success', `"${created.title}" added. Press "Update AI index" so the chatbot knows it.`);
    }
    // errors are not caught here on purpose: BookForm shows them inside the popup
  };

  // ===== AVAILABILITY toggle =====
  const toggleAvailable = async (book) => {
    try {
      replaceBook(await authFetch(`/api/library/books/${book.id}`, 'PATCH', { is_available: !book.is_available }));
    } catch (err) {
      showMessage('error', err.message);
    }
  };

  // ===== DELETE =====
  const deleteBook = async (book) => {
    // Browser "Are you sure?" popup (Cancel = stop)
    if (!window.confirm(`Delete "${book.title}"? This can't be undone.`)) return;
    try {
      await authFetch(`/api/library/books/${book.id}`, 'DELETE');
      setBooks(prev => prev.filter(b => b.id !== book.id));  // remove it from the table
      showMessage('success', `"${book.title}" deleted.`);
    } catch (err) {
      showMessage('error', err.message);
    }
  };

  // ===== IMPORT CSV =====
  const importCsv = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';           // reset, so picking the same file again still works
    if (!file) return;             // the librarian clicked Cancel

    setIsImporting(true);
    showMessage('success', `Importing ${file.name}...`);
    try {
      const csvText = await file.text();   // read the whole file as text
      const result = await authFetch('/api/library/books/import', 'POST', { csv_text: csvText });

      // e.g. "Added 12 books, skipped 3 already in the library. New courses: CC-AI31."
      let text = `Added ${result.added} book(s), skipped ${result.skipped} already in the library.`;
      if (result.new_courses.length > 0) text += ` New courses: ${result.new_courses.join(', ')}.`;
      if (result.added > 0) text += ' Press "Update AI index" so the chatbot knows them.';
      showMessage('success', text);

      await loadAll();             // reload so the new books and courses show
    } catch (err) {
      showMessage('error', err.message);
    } finally {
      setIsImporting(false);
    }
  };

  // ===== UPDATE AI INDEX =====
  const updateAiIndex = async () => {
    setIsIndexing(true);
    showMessage('success', 'Updating the AI index... this can take a moment.');
    try {
      const result = await authFetch('/api/library/ai-index', 'POST');
      showMessage('success', result.message);
      await loadAll();   // reload so the badges disappear
    } catch (err) {
      showMessage('error', err.message);
    } finally {
      setIsIndexing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center gap-4">
          <Link to="/chat" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
            <ArrowLeftIcon className="h-4 w-4" /> Back to chat
          </Link>
          <h1 className="text-xl font-bold text-gray-900">
            <span className="text-fuchsia-700">Libraria</span> Library
          </h1>
        </div>
        <span className="text-xs text-gray-500">Signed in as {user.name}</span>
      </header>

      <main className="mx-auto max-w-6xl space-y-4 p-6">
        {/* Stats cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
          {stats.map(s => (
            <div key={s.label} className="rounded-2xl border border-gray-200 bg-white p-4">
              <p className="text-xs text-gray-500">{s.label}</p>
              <p className="text-2xl font-bold text-gray-900">{isLoading ? '–' : s.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs + buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-1 rounded-full bg-gray-200 p-1">
            {['books', 'courses'].map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded-full px-4 py-1.5 text-xs font-medium capitalize ${
                  tab === t ? 'bg-white text-gray-900 shadow' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            {/* Update AI index (shows how many books are waiting) */}
            <button
              onClick={updateAiIndex}
              disabled={isIndexing || needsAiCount === 0}
              className="flex items-center gap-1 rounded-full border border-fuchsia-700 px-4 py-2 text-xs font-medium text-fuchsia-700 hover:bg-fuchsia-50 disabled:opacity-40"
            >
              <ArrowPathIcon className={`h-4 w-4 ${isIndexing ? 'animate-spin' : ''}`} />
              {isIndexing ? 'Updating...' : `Update AI index (${needsAiCount})`}
            </button>

            {tab === 'books' && (
              <>
                {/* Hidden file picker: the button below "clicks" it */}
                <input ref={fileInput} type="file" accept=".csv,text/csv" onChange={importCsv} className="hidden" />
                <button
                  onClick={() => fileInput.current.click()}
                  disabled={isImporting}
                  title="Same columns as BSCS_Holdings_Cleaned.csv"
                  className="flex items-center gap-1 rounded-full border border-gray-300 bg-white px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                >
                  <ArrowUpTrayIcon className="h-4 w-4" />
                  {isImporting ? 'Importing...' : 'Import CSV'}
                </button>
              </>
            )}

            {tab === 'books' && (
              <button
                onClick={() => setFormBook(null)}
                className="flex items-center gap-1 rounded-full bg-amber-600 px-4 py-2 text-xs font-medium text-white hover:bg-amber-700"
              >
                <PlusIcon className="h-4 w-4" /> Add book
              </button>
            )}
          </div>
        </div>

        {/* Green / red message box */}
        {message.text && (
          <p
            className={`rounded-lg border px-3 py-2 text-xs ${
              message.type === 'error' ? 'border-red-200 bg-red-50 text-red-600' : 'border-green-200 bg-green-50 text-green-700'
            }`}
          >
            {message.text}
          </p>
        )}

        {tab === 'courses' ? (
          // ===== COURSES TAB =====
          <CoursesPanel courses={courses} books={books} onChanged={loadAll} showMessage={showMessage} />
        ) : (
          // ===== BOOKS TAB =====
          <>
            {/* Search + filters */}
            <div className="flex flex-wrap gap-2">
              <div className="relative min-w-[200px] flex-1">
                <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  placeholder="Search title, author, or call number"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className={`${INPUT} w-full pl-9`}
                />
              </div>
              <select value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)} className={INPUT}>
                <option value="">All courses</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.code}</option>)}
              </select>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={INPUT}>
                <option value="">All books</option>
                <option value="available">Available</option>
                <option value="unavailable">Not available</option>
                <option value="needs-ai">Needs AI update</option>
              </select>
            </div>

            {/* Books table */}
            <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Book</th>
                    <th className="px-4 py-3">Courses</th>
                    <th className="px-4 py-3">Format</th>
                    <th className="px-4 py-3">Copies</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400">Loading books...</td></tr>
                  ) : shownBooks.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400">No books match.</td></tr>
                  ) : (
                    // One row per book
                    shownBooks.map(b => (
                      <tr key={b.id} className="border-b border-gray-100 align-top last:border-0">
                        {/* Title, author, call number, short description */}
                        <td className="max-w-xs px-4 py-3">
                          <p className="font-medium text-gray-900">{b.title}</p>
                          <p className="text-xs text-gray-500">
                            {b.author ?? 'Unknown author'}
                            {b.call_number && ` · ${b.call_number}`}
                          </p>
                          {b.description && <p className="mt-1 line-clamp-2 text-xs text-gray-400">{b.description}</p>}
                        </td>

                        {/* Course tags */}
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {b.courses.length === 0 ? (
                              <span className="text-xs text-gray-400">None</span>
                            ) : (
                              b.courses.map(c => (
                                <span key={c.id} title={c.name} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                                  {c.code}
                                </span>
                              ))
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-3 text-xs text-gray-700">{b.format}</td>

                        {/* Number of copies (red when 0) */}
                        <td className={`px-4 py-3 text-xs ${b.copies === 0 ? 'font-medium text-red-600' : 'text-gray-700'}`}>{b.copies}</td>

                        {/* Availability button + AI badge */}
                        <td className="space-y-1 px-4 py-3">
                          <button
                            onClick={() => toggleAvailable(b)}
                            title="Click to change"
                            className={`block rounded-full px-2 py-0.5 text-xs font-medium ${
                              b.is_available ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                            }`}
                          >
                            {b.is_available ? 'Available' : 'Not available'}
                          </button>
                          {!b.is_indexed && (
                            <span className="block w-fit rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                              Needs AI update
                            </span>
                          )}
                        </td>

                        {/* Buttons */}
                        <td className="space-x-2 whitespace-nowrap px-4 py-3 text-right">
                          <button onClick={() => setFormBook(b)} className="rounded-lg px-2 py-1 text-xs text-gray-700 hover:bg-gray-100">
                            Edit
                          </button>
                          <button onClick={() => deleteBook(b)} className="rounded-lg px-2 py-1 text-xs text-red-600 hover:bg-red-50">
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>

      {/* Add / Edit popup (only when formBook is not undefined) */}
      {formBook !== undefined && (
        <BookForm book={formBook} courses={courses} onSave={saveBook} onClose={() => setFormBook(undefined)} />
      )}
    </div>
  );
};

export default LibraryPage;
