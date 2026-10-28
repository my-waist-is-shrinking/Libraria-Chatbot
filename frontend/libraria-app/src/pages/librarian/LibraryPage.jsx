import { useEffect, useRef, useState } from 'react';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import {
  ArrowPathIcon,
  ArrowUpTrayIcon,
  BookOpenIcon,
  EllipsisVerticalIcon,
  LinkIcon,
  ListBulletIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  PlusIcon,
  Squares2X2Icon,
  TrashIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../context/AuthContext';
import BookForm from '../../components/librarian/BookForm';
import CoursesPanel from '../../components/librarian/CoursesPanel';

const COVER_TINTS = [
  { bg: 'bg-[#EFEAFC]', spine: 'bg-[#DFD5FA]', icon: 'text-[#4E426D]' },
  { bg: 'bg-[#FDF0E6]', spine: 'bg-[#FBE0CC]', icon: 'text-[#F99A4B]' },
  { bg: 'bg-[#EAF4FC]', spine: 'bg-[#D5E9FA]', icon: 'text-[#5299E5]' },
  { bg: 'bg-[#E8F8F0]', spine: 'bg-[#D1F1E1]', icon: 'text-[#38B27B]' },
];

const BOOKS_PER_PAGE = 10;

// Pagination bar
const PaginationBar = ({ page, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;

  const getPages = () => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (page <= 3) return [1, 2, 3, '...', totalPages];
    if (page >= totalPages - 2) return [1, '...', totalPages - 2, totalPages - 1, totalPages];
    return [1, '...', page, '...', totalPages];
  };

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="mr-2 text-[#8E8EA0]">
        Page {page} of {totalPages}
      </span>

      <button
        type="button"
        disabled={page === 1}
        onClick={() => onPageChange(page - 1)}
        className="flex h-8 w-8 items-center justify-center rounded-full font-semibold text-[#251E36] hover:bg-gray-100 disabled:invisible"
      >
        «
      </button>

      {getPages().map((p, idx) =>
        p === '...' ? (
          <span
            key={`dots-${idx}`}
            className="flex h-8 w-8 items-center justify-center font-semibold text-[#8E8EA0]"
          >
            ...
          </span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onPageChange(p)}
            className={`flex h-8 w-8 items-center justify-center rounded-full font-semibold transition ${
              p === page
                ? 'bg-[#4E426D] text-white shadow-xs'
                : 'text-[#251E36] hover:bg-gray-100'
            }`}
          >
            {p}
          </button>
        )
      )}

      <button
        type="button"
        disabled={page === totalPages}
        onClick={() => onPageChange(page + 1)}
        className="flex h-8 w-8 items-center justify-center rounded-full font-semibold text-[#251E36] hover:bg-gray-100 disabled:invisible"
      >
        »
      </button>
    </div>
  );
};

const LibraryPage = () => {
  const { authFetch } = useAuth();

  const [books, setBooks] = useState([]);
  const [courses, setCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isIndexing, setIsIndexing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInput = useRef(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [tab, setTab] = useState('books');
  const [viewMode, setViewMode] = useState('list');
  const [formBook, setFormBook] = useState(undefined);

  const [search, setSearch] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [search, courseFilter, statusFilter]);

  const showMessage = (type, text) => setMessage({ type, text });

  const loadAll = async () => {
    setIsLoading(true);
    try {
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

  useEffect(() => {
    loadAll();
  }, []);

  const replaceBook = (updated) =>
    setBooks((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));

  const needsAiCount = books.filter((b) => !b.is_indexed).length;

  const text = search.trim().toLowerCase();
  const shownBooks = books.filter((b) => {
    const matchesSearch =
      !text ||
      b.title.toLowerCase().includes(text) ||
      (b.author ?? '').toLowerCase().includes(text) ||
      (b.call_number ?? '').toLowerCase().includes(text) ||
      (b.publisher ?? '').toLowerCase().includes(text);

    const matchesCourse =
      !courseFilter || b.courses.some((c) => String(c.id) === courseFilter);

    const matchesStatus =
      !statusFilter ||
      (statusFilter === 'available' && b.is_available) ||
      (statusFilter === 'unavailable' && !b.is_available) ||
      (statusFilter === 'needs-ai' && !b.is_indexed);

    return matchesSearch && matchesCourse && matchesStatus;
  });

  const perPage = viewMode === 'grid' ? 9 : BOOKS_PER_PAGE;
  const totalPages = Math.max(1, Math.ceil(shownBooks.length / perPage));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * perPage;
  const paginatedBooks = shownBooks.slice(startIndex, startIndex + perPage);

  const saveBook = async (data) => {
    if (formBook) {
      replaceBook(await authFetch(`/api/library/books/${formBook.id}`, 'PATCH', data));
      showMessage('success', `"${data.title}" saved.`);
    } else {
      const created = await authFetch('/api/library/books', 'POST', data);
      setBooks((prev) => [...prev, created]);
      showMessage(
        'success',
        `"${created.title}" added. Press "Update AI index" so the chatbot knows it.`
      );
    }
  };

  const toggleAvailable = async (book) => {
    try {
      replaceBook(
        await authFetch(`/api/library/books/${book.id}`, 'PATCH', {
          is_available: !book.is_available,
        })
      );
    } catch (err) {
      showMessage('error', err.message);
    }
  };

  const deleteBook = async (book) => {
    if (!window.confirm(`Delete "${book.title}"? This can't be undone.`)) return;
    try {
      await authFetch(`/api/library/books/${book.id}`, 'DELETE');
      setBooks((prev) => prev.filter((b) => b.id !== book.id));
      showMessage('success', `"${book.title}" deleted.`);
    } catch (err) {
      showMessage('error', err.message);
    }
  };

  const importCsv = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;

    setIsImporting(true);
    showMessage('success', `Importing ${file.name}...`);
    try {
      const csvText = await file.text();
      const result = await authFetch('/api/library/books/import', 'POST', {
        csv_text: csvText,
      });

      let msg = `Added ${result.added} book(s), skipped ${result.skipped} already in the library.`;
      if (result.new_courses.length > 0)
        msg += ` New courses: ${result.new_courses.join(', ')}.`;
      if (result.added > 0)
        msg += ' Press "Update AI index" so the chatbot knows them.';
      showMessage('success', msg);

      await loadAll();
    } catch (err) {
      showMessage('error', err.message);
    } finally {
      setIsImporting(false);
    }
  };

  const updateAiIndex = async () => {
    setIsIndexing(true);
    showMessage('success', 'Updating the AI index... this can take a moment.');
    try {
      const result = await authFetch('/api/library/ai-index', 'POST');
      showMessage('success', result.message);
      await loadAll();
    } catch (err) {
      showMessage('error', err.message);
    } finally {
      setIsIndexing(false);
    }
  };

  const hasActiveFilters = Boolean(courseFilter || statusFilter);

  return (
    <div className="flex flex-1 flex-col overflow-y-scroll bg-white">
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col space-y-5 p-6">
        {/* Top bar: Tabs + Secondary actions */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex gap-1 rounded-full border border-gray-200 bg-white p-1">
              {['books', 'courses'].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={`rounded-full px-4 py-1 text-xs font-semibold capitalize transition ${
                    tab === t
                      ? 'bg-[#4E426D] text-white shadow-xs'
                      : 'text-[#8E8EA0] hover:text-[#251E36]'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={updateAiIndex}
              disabled={isIndexing || needsAiCount === 0}
              className="inline-flex h-8 items-center gap-1.5 rounded-full border border-[#4E426D]/40 bg-[#EFEAFC] px-3.5 text-xs font-semibold text-[#4E426D] hover:bg-[#E2D9FA] disabled:cursor-default"
            >
              <ArrowPathIcon className={`h-3.5 w-3.5 ${isIndexing ? 'animate-spin' : ''}`} />
              {isIndexing ? 'Updating...' : `Update AI (${needsAiCount})`}
            </button>

            {tab === 'books' && (
              <>
                <input
                  ref={fileInput}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={importCsv}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInput.current.click()}
                  disabled={isImporting}
                  className="inline-flex h-8 items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3.5 text-xs font-semibold text-[#251E36] hover:bg-gray-50 disabled:opacity-40"
                >
                  <ArrowUpTrayIcon className="h-3.5 w-3.5 text-[#8E8EA0]" />
                  {isImporting ? 'Importing...' : 'Import CSV'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Status message */}
        {message.text && (
          <p
            className={`rounded-lg border px-3 py-2 text-xs ${
              message.type === 'error'
                ? 'border-red-200 bg-red-50 text-red-600'
                : 'border-emerald-200 bg-emerald-50 text-emerald-700'
            }`}
          >
            {message.text}
          </p>
        )}

        {tab === 'courses' ? (
          <CoursesPanel
            courses={courses}
            books={books}
            onChanged={loadAll}
            showMessage={showMessage}
          />
        ) : (
          <>
            {/* Header toolbar: Books Collection + Search/Filter + View Toggle + Add Book */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-[#251E36]">Books Collection</h1>
                <span className="text-sm font-semibold text-[#8E8EA0]">
                  {shownBooks.length}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {/* Search input with built-in filter dropdown */}
                <div className="flex h-10 w-72 items-center rounded-xl bg-white px-3 ring-1 ring-gray-200 focus-within:ring-[#4E426D]">
                  <MagnifyingGlassIcon className="h-4 w-4 shrink-0 text-[#8E8EA0]" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search a book"
                    className="w-full bg-transparent px-2.5 text-xs text-[#251E36] placeholder-[#8E8EA0] focus:outline-none"
                  />

                  {/* Filter menu inside search box */}
                  <Menu as="div" className="relative">
                    <MenuButton
                      title="Filter books"
                      className={`flex h-7 w-7 items-center justify-center rounded-lg transition focus:outline-none ${
                        hasActiveFilters
                          ? 'bg-[#EFEAFC] text-[#4E426D]'
                          : 'text-[#8E8EA0] hover:bg-gray-200/60 hover:text-[#251E36]'
                      }`}
                    >
                      <svg
                        className="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      >
                        <path d="M4 6h16M4 12h16M4 18h16" />
                        <circle cx="8" cy="6" r="2" fill="currentColor" />
                        <circle cx="16" cy="12" r="2" fill="currentColor" />
                        <circle cx="10" cy="18" r="2" fill="currentColor" />
                      </svg>
                    </MenuButton>

                    <MenuItems className="absolute right-0 top-full z-50 mt-2 w-52 space-y-2 rounded-2xl border border-gray-200 bg-white p-3 shadow-lg focus:outline-none">
                      <div>
                        <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[#8E8EA0]">
                          Status
                        </p>
                        {[
                          { value: '', label: 'All books' },
                          { value: 'available', label: 'Available' },
                          { value: 'unavailable', label: 'Borrowed / Unavailable' },
                          { value: 'needs-ai', label: 'Needs AI update' },
                        ].map((opt) => (
                          <MenuItem key={opt.label}>
                            <button
                              type="button"
                              onClick={() => setStatusFilter(opt.value)}
                              className={`flex w-full items-center rounded-xl px-2.5 py-1.5 text-left text-xs transition hover:bg-[#EFEAFC]/60 hover:font-semibold hover:text-[#4E426D] ${
                                statusFilter === opt.value
                                  ? 'bg-[#EFEAFC]/60 font-semibold text-[#4E426D]'
                                  : 'font-medium text-[#251E36]'
                              }`}
                            >
                              {opt.label}
                            </button>
                          </MenuItem>
                        ))}
                      </div>
                    </MenuItems>
                  </Menu>
                </div>

                {/* List / Grid toggle buttons */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    className={`flex h-10 w-10 items-center justify-center rounded-xl transition ${
                      viewMode === 'list'
                        ? 'bg-[#4E426D] text-white shadow-xs'
                        : 'bg-white text-[#251E36] ring-1 ring-gray-200 hover:bg-[#EFEAFC]/60 hover:text-[#4E426D]'
                    }`}
                  >
                    <ListBulletIcon className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={`flex h-10 w-10 items-center justify-center rounded-xl transition ${
                      viewMode === 'grid'
                        ? 'bg-[#4E426D] text-white shadow-xs'
                        : 'bg-white text-[#251E36] ring-1 ring-gray-200 hover:bg-[#EFEAFC]/60 hover:text-[#4E426D]'
                    }`}
                  >
                    <Squares2X2Icon className="h-5 w-5" />
                  </button>
                </div>

                {/* Add Book button */}
                <button
                  type="button"
                  onClick={() => setFormBook(null)}
                  className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#4E426D] px-4 text-xs font-semibold text-white shadow-xs hover:bg-[#3E3457]"
                >
                  <PlusIcon className="h-4 w-4" />
                  Add Book
                </button>
              </div>
            </div>

            {/* Books list or grid */}
            {viewMode === 'list' ? (
              <div className="overflow-visible">
                <table className="w-full table-fixed text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-[#F9F9FB] text-xs font-medium text-[#8E8EA0]">
                      <th className="w-[38%] rounded-l-xl py-3 px-4 font-medium">
                        Book <span className="ml-0.5 text-[10px]">⇅</span>
                      </th>
                      <th className="w-[20%] py-3 px-3 font-medium">
                        Publisher <span className="ml-0.5 text-[10px]">⇅</span>
                      </th>
                      <th className="w-[14%] py-3 px-3 font-medium">
                        Status <span className="ml-0.5 text-[10px]">⇅</span>
                      </th>
                      <th className="w-[23%] py-3 px-3 font-medium">
                        Details <span className="ml-0.5 text-[10px]">⇅</span>
                      </th>
                      <th className="w-[5%] rounded-r-xl py-3 pr-3 text-right" />
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {isLoading ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-xs text-[#8E8EA0]">
                          Loading books...
                        </td>
                      </tr>
                    ) : shownBooks.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-xs text-[#8E8EA0]">
                          No matching books found.
                        </td>
                      </tr>
                    ) : (
                      paginatedBooks.map((b, idx) => {
                        const tint = COVER_TINTS[(startIndex + idx) % COVER_TINTS.length];
                        const bookCode = `BK-${String(b.id).padStart(5, '0')}`;
                        const availableCopies = b.is_available ? b.copies : 0;

                        return (
                          <tr key={b.id} className="transition hover:bg-gray-50/60">
                            {/* Column 1: Cover thumbnail + Title + Code + Author */}
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3.5">
                                <div
                                  className={`relative flex h-16 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg ${tint.bg} shadow-2xs`}
                                >
                                  <div
                                    className={`absolute inset-y-0 left-0 w-1.5 ${tint.spine}`}
                                  />
                                  <BookOpenIcon className={`h-5 w-5 ${tint.icon}`} />
                                </div>

                                <div className="min-w-0 flex-1 space-y-0.5">
                                  <p className="truncate text-xs font-bold text-[#251E36]">
                                    {b.title}
                                  </p>
                                  <p className="text-[11px] text-[#8E8EA0]">{bookCode}</p>
                                  <div className="flex items-center gap-1.5 pt-0.5">
                                    <UserCircleIcon className="h-4 w-4 shrink-0 text-[#4E426D]" />
                                    <span className="truncate text-[11px] font-medium text-[#251E36]">
                                      {b.author || 'Unknown author'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Column 2: Publisher + Edition/Format */}
                            <td className="py-3 px-3">
                              <p className="truncate text-xs font-bold text-[#251E36]">
                                {b.publisher || 'CCS Library Press'}
                              </p>
                              <p className="mt-0.5 text-[11px] text-[#8E8EA0]">
                                {b.edition ? `${b.edition} Ed.` : b.format}
                              </p>
                            </td>

                            {/* Column 3: Status pill */}
                            <td className="py-3 px-3">
                              <div className="flex flex-col items-start gap-1">
                                <button
                                  type="button"
                                  onClick={() => toggleAvailable(b)}
                                  title="Click to toggle availability"
                                  className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold transition ${
                                    b.is_available
                                      ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                      : 'bg-[#FDF0E6] text-[#F99A4B] hover:bg-[#FBE0CC]'
                                  }`}
                                >
                                  {b.is_available ? 'Available' : 'Borrowed'}
                                </button>

                                {!b.is_indexed && (
                                  <span className="inline-flex items-center rounded-full bg-[#EFEAFC] px-2.5 py-0.5 text-[10px] font-semibold text-[#4E426D]">
                                    Needs AI
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Column 4: Copies + Shelf + Course/Format link */}
                            <td className="py-3 px-3 text-[11px]">
                              <div className="space-y-0.5">
                                <p className="text-[#8E8EA0]">
                                  Copies:{' '}
                                  <span className="font-bold text-[#251E36]">
                                    {availableCopies}/{b.copies}
                                  </span>
                                </p>
                                <p className="truncate text-[#8E8EA0]">
                                  Shelf:{' '}
                                  <span className="font-bold text-[#251E36]">
                                    {b.call_number || 'CCS-MAIN'}
                                  </span>
                                </p>
                                <div className="flex items-center gap-1 text-[#4E426D]">
                                  <LinkIcon className="h-3 w-3 shrink-0 text-[#8E8EA0]" />
                                  <span className="truncate font-medium">
                                    {b.courses.length > 0
                                      ? b.courses.map((c) => c.code).join(', ')
                                      : b.format}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Column 5: Action menu */}
                            <td className="py-3 pr-3 text-right">
                              <Menu as="div" className="relative inline-block text-left">
                                <MenuButton className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#8E8EA0] hover:bg-gray-100 hover:text-[#251E36] focus:outline-none">
                                  <EllipsisVerticalIcon className="h-4 w-4" />
                                </MenuButton>

                                <MenuItems className="absolute right-0 top-full z-50 mt-1.5 w-44 space-y-0.5 rounded-2xl border border-gray-200 bg-white p-2 shadow-lg focus:outline-none">
                                  <MenuItem>
                                    <button
                                      type="button"
                                      onClick={() => setFormBook(b)}
                                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-medium text-[#251E36] hover:bg-[#EFEAFC]/60 hover:font-semibold hover:text-[#4E426D]"
                                    >
                                      <PencilSquareIcon className="h-4 w-4 text-[#8E8EA0]" />
                                      Edit book
                                    </button>
                                  </MenuItem>

                                  <MenuItem>
                                    <button
                                      type="button"
                                      onClick={() => toggleAvailable(b)}
                                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-medium text-[#251E36] hover:bg-[#EFEAFC]/60 hover:font-semibold hover:text-[#4E426D]"
                                    >
                                      <ArrowPathIcon className="h-4 w-4 text-[#8E8EA0]" />
                                      {b.is_available ? 'Mark borrowed' : 'Mark available'}
                                    </button>
                                  </MenuItem>

                                  <div className="my-1 border-t border-gray-100" />

                                  <MenuItem>
                                    <button
                                      type="button"
                                      onClick={() => deleteBook(b)}
                                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-medium text-red-600 hover:bg-red-50 hover:font-semibold"
                                    >
                                      <TrashIcon className="h-4 w-4 text-red-500" />
                                      Delete book
                                    </button>
                                  </MenuItem>
                                </MenuItems>
                              </Menu>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              /* Grid view */
              <div className="min-h-[460px]">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {paginatedBooks.map((b, idx) => {
                    const tint = COVER_TINTS[(startIndex + idx) % COVER_TINTS.length];
                    return (
                      <div
                        key={b.id}
                        className="flex flex-col justify-between rounded-2xl border border-gray-100 bg-white p-4 shadow-2xs transition hover:border-[#4E426D]/30 hover:shadow-md"
                      >
                        <div className="flex gap-3.5">
                          <div
                            className={`relative flex h-20 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg ${tint.bg}`}
                          >
                            <div className={`absolute inset-y-0 left-0 w-1.5 ${tint.spine}`} />
                            <BookOpenIcon className={`h-6 w-6 ${tint.icon}`} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-2 text-xs font-bold text-[#251E36]">
                              {b.title}
                            </p>
                            <p className="mt-1 truncate text-[11px] text-[#8E8EA0]">
                              {b.author || 'Unknown author'}
                            </p>
                            <span
                              className={`mt-2 inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                                b.is_available
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-[#FDF0E6] text-[#F99A4B]'
                              }`}
                            >
                              {b.is_available ? 'Available' : 'Borrowed'}
                            </span>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-2.5 text-[11px] text-[#8E8EA0]">
                          <span>Copies: {b.copies}</span>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setFormBook(b)}
                              className="font-semibold text-[#4E426D] hover:underline"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteBook(b)}
                              className="font-semibold text-red-500 hover:underline"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {/* Bottom pagination */}
            <div className="flex justify-end pt-2 pb-4">
              <PaginationBar
                page={currentPage}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            </div>
          </>
        )}
      </main>

      {/* Add / Edit popup */}
      {formBook !== undefined && (
        <BookForm
          book={formBook}
          courses={courses}
          onSave={saveBook}
          onClose={() => setFormBook(undefined)}
        />
      )}
    </div>
  );
};

export default LibraryPage;
