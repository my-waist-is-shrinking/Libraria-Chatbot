import { useEffect, useState, useRef } from 'react';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/solid';
import {
  ArrowLeftIcon,
  BookOpenIcon,
  ChatBubbleLeftEllipsisIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  Squares2X2Icon,
} from '@heroicons/react/20/solid';

// Put your chosen background photo path or URL here (e.g. '/hero.jpg' or imported asset)
const HERO_IMAGE_URL = '/lib-background.jpg';

// Where the FastAPI backend runs
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const ITEMS_PER_PAGE = 6; // 6 cards per page (3 columns x 2 rows)

// The 3 Academy 2-tone color themes (Peach-Orange, Lavender-Purple, Sky-Blue)
const CARD_THEMES = [
  { outer: 'bg-[#FDF0EF]', inner: 'bg-[#E95D55]', text: 'text-[#E95D55]' }, // 1. Coral
  { outer: 'bg-[#EFEAFC]', inner: 'bg-[#4E426D]', text: 'text-[#4E426D]' }, // 2. Lavender / Purple
  { outer: 'bg-[#EAF4FC]', inner: 'bg-[#5299E5]', text: 'text-[#5299E5]' }, // 3. Ice Blue / Sky
];

// Helper to format stats into milestones (e.g. 154 -> 150+, 23 -> 20+)
const formatStat = (num) => {
  if (!num) return '0';
  if (num >= 100) return `${Math.floor(num / 10) * 10}+`;
  if (num >= 10) return `${Math.floor(num / 10) * 10}+`;
  return `${num}`;
};

// Pagination bar
const PaginationBar = ({ page, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;

  // Build page number list with ellipsis
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
          <span key={`dots-${idx}`} className="flex h-8 w-8 items-center justify-center font-semibold text-[#8E8EA0]">
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

// Book Card: clean orange cover with no outer border box
const BookCard = ({ book, onSelect }) => (
  <button
    type="button"
    onClick={() => onSelect({ ...book, themeIndex: 0 })}
    className={`group relative flex aspect-[3/4] min-h-[240px] w-full flex-col overflow-hidden rounded-2xl ${CARD_THEMES[0].inner} text-center text-white shadow-sm transition hover:-translate-y-1 hover:shadow-md focus:outline-none`}
  >
    {book.cover_image ? (
      <img
        src={book.cover_image}
        alt={book.title}
        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
      />
    ) : (
      <div className="flex h-full w-full flex-col items-center justify-center p-6">
        <BookOpenIcon className="mb-3 h-10 w-10 text-white/80 transition group-hover:scale-110" />
        <p className="line-clamp-4 text-sm font-bold leading-snug text-white">{book.title}</p>
      </div>
    )}

    {/* Availability pill */}
    <span
      className={`absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-xs ${
        book.is_available ? 'bg-white text-emerald-600' : 'bg-white/90 text-slate-600'
      }`}
    >
      {book.is_available && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {book.is_available ? 'Available' : 'Unavailable'}
    </span>
  </button>
);

// Pastel icon colors for course rows
const COURSE_ICON_STYLES = [
  'bg-[#EFEAFC] text-[#4E426D]',
  'bg-[#EAF4FC] text-[#5299E5]',
  'bg-[#FCE7F3] text-[#EC4899]',
  'bg-[#FDF0E6] text-[#F99A4B]',
];

// Course row item
const CourseRow = ({ course, index = 0, onClick }) => {
  const iconStyle = COURSE_ICON_STYLES[index % COURSE_ICON_STYLES.length];

  return (
    <button
      type="button"
      onClick={onClick}
      className="group grid w-full grid-cols-[1fr_auto] items-center gap-4 rounded-2xl py-3 px-2 text-left transition hover:bg-gray-50 sm:grid-cols-[1fr_160px_100px_100px]"
    >
      {/* Course name + book count */}
      <div className="flex items-center gap-4 min-w-0">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${iconStyle}`}>
          <BookOpenIcon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-[#251E36] group-hover:text-[#4E426D]">
            {course.name}
          </p>
          <p className="mt-0.5 text-xs text-[#8E8EA0]">
            {course.count} {course.count === 1 ? 'book' : 'books'}
          </p>
        </div>
      </div>

      {/* Course code */}
      <span className="text-xs font-semibold text-[#251E36] sm:text-center">{course.code}</span>

      {/* Total books */}
      <span className="hidden text-center text-xs font-semibold text-[#251E36] sm:block">{course.count}</span>

      {/* Department */}
      <span className="hidden text-right text-xs font-medium text-[#251E36] sm:block">CCS</span>
    </button>
  );
};

const BookSearchPanel = ({ view = 'discover', onNavigate, onAsk }) => {
  const [allBooks, setAllBooks] = useState([]);       // all books loaded from backend
  const [isLoading, setIsLoading] = useState(true);   // true while loading
  const [error, setError] = useState('');

  // Discover search bar + selected book + pagination state
  const [search, setSearch] = useState('');
  const [selectedCourse, setSelectedCourse] = useState(''); // course code in dropdown or category click
  const [showAllBooks, setShowAllBooks] = useState(false);  // true when "View all >" is clicked
  const [selectedBook, setSelectedBook] = useState(null);   // book clicked to open its own details page
  const [bookPage, setBookPage] = useState(1);              // current page for books (6 per page)
  const [catPage, setCatPage] = useState(1);                // current page for categories (6 per page)
  const collectionRef = useRef(null);

  // Load books once when opened
  useEffect(() => {
    const loadBooks = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`${API_URL}/api/books`, { headers: { "ngrok-skip-browser-warning": "true" } });
        if (!response.ok) throw new Error();
        setAllBooks(await response.json());
        setError('');
      } catch {
        setError("Can't reach the server. Is the backend running?");
      } finally {
        setIsLoading(false);
      }
    };
    loadBooks();
  }, []);

  // Reset filters when switching between Discover and Categories in the sidebar
  useEffect(() => {
    setSelectedBook(null);
    setSelectedCourse('');
    setSearch('');
    setShowAllBooks(false);
    setBookPage(1);
    setCatPage(1);
  }, [view]);

  // Reset bookPage to 1 whenever search or course filter changes
  useEffect(() => {
    setBookPage(1);
    setCatPage(1)
  }, [search, selectedCourse, showAllBooks]);

  // Build unique list of courses from the books, plus how many books each course has
  const courseMap = new Map();
  allBooks.forEach(book => {
    book.courses.forEach(c => {
      const existing = courseMap.get(c.code);
      courseMap.set(c.code, { ...c, count: existing ? existing.count + 1 : 1 });
    });
  });
  const courses = Array.from(courseMap.values()).sort((a, b) => a.code.localeCompare(b.code));

  // Filter books by search text and/or selected course
  const text = search.trim().toLowerCase();
  const filteredBooks = allBooks.filter(b => {
    const matchesTitle = !text || b.title.toLowerCase().includes(text) || (b.author ?? '').toLowerCase().includes(text);
    const matchesCourse = !selectedCourse || b.courses.some(c => c.code === selectedCourse);
    return matchesTitle && matchesCourse;
  });

  // Paginate filteredBooks (6 per page)
  const totalBookPages = Math.max(1, Math.ceil(filteredBooks.length / ITEMS_PER_PAGE));
  const currentBookPage = Math.min(bookPage, totalBookPages);
  const pagedBooks = filteredBooks.slice(
    (currentBookPage - 1) * ITEMS_PER_PAGE,
    currentBookPage * ITEMS_PER_PAGE
  );

  // Paginate courses (6 per page)
  // Filter and paginate courses (6 per page)
  const filteredCourses = courses.filter(
    c => !text || c.code.toLowerCase().includes(text) || c.name.toLowerCase().includes(text)
  );
  const totalCatPages = Math.max(1, Math.ceil(filteredCourses.length / ITEMS_PER_PAGE));
  const currentCatPage = Math.min(catPage, totalCatPages);
  const pagedCourses = filteredCourses.slice(
    (currentCatPage - 1) * ITEMS_PER_PAGE,
    currentCatPage * ITEMS_PER_PAGE
  );
  
  // ===== DEDICATED BOOK DETAILS PAGE (when a book cover is clicked) =====
  if (selectedBook) {
    const theme = CARD_THEMES[(selectedBook.themeIndex ?? 0) % CARD_THEMES.length];

    return (
      <div className="flex-1 overflow-y-auto bg-white p-6">
        <div className="mx-auto max-w-5xl space-y-6 pb-16">
          {/* Breadcrumbs on the top-right only */}
          <div className="flex items-center justify-end text-xs font-medium text-[#8E8EA0]">
            <button onClick={() => setSelectedBook(null)} className="hover:text-[#251E36]">
              {view === 'categories' ? 'Categories' : 'Discover'}
            </button>
            <ChevronRightIcon className="mx-1 h-4 w-4" />
            <span className="max-w-[220px] truncate font-semibold text-[#251E36]">
              {selectedBook.title}
            </span>
          </div>

          {/* Two-column layout: Left = cover + buttons, Right = pills, title, summary, Book Information */}
          <div className="grid gap-10 md:grid-cols-[280px_1fr]">

            {/* LEFT COLUMN: Cover + stacked buttons below */}
            <div className="flex flex-col gap-3">

              {/* Book cover */}
              <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl shadow-md">
                {selectedBook.cover_image ? (
                  <img
                    src={selectedBook.cover_image}
                    alt={selectedBook.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className={`flex h-full w-full flex-col items-center justify-center ${theme.inner} p-6 text-center text-white`}>
                    <BookOpenIcon className="mb-3 h-14 w-14 text-white/80" />
                    <p className="text-sm font-bold text-white">{selectedBook.title}</p>
                    <p className="mt-2 text-xs text-white/70">No cover photo yet</p>
                  </div>
                )}
              </div>

              {/* Primary button */}
              <button
                onClick={() => onAsk(`Tell me about the book "${selectedBook.title}"`)}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#4E426D] py-3 text-xs font-semibold text-white shadow-xs hover:bg-[#3E3457]"
              >
                <ChatBubbleLeftEllipsisIcon className="h-4 w-4" />
                Ask Libraria about this book
              </button>

              {/* Back button */}
              <button
                onClick={() => setSelectedBook(null)}
                className="flex w-full items-center justify-center gap-2 py-2 text-xs font-semibold text-gray-900 transition hover:text-gray-600 hover:underline"
              >
                <ArrowLeftIcon className="h-4 w-4" />
                Back to Books
              </button>
            </div>

            {/* RIGHT COLUMN: Status pills, big title, summary, and Information rows */}
            <div className="space-y-6 pt-6">
              {/* Status + Format badges */}
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-semibold ${
                    selectedBook.is_available
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  {selectedBook.is_available ? 'Available' : 'Not Available'}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#EFEAFC] px-3 py-1 text-xs font-semibold text-[#4E426D]">
                  <BookOpenIcon className="h-3.5 w-3.5" />
                  {selectedBook.format === 'E-Book' ? 'E-Book (Online)' : 'Print Book'}
                </span>
              </div>

              {/* Big Title */}
              <h1 className="text-3xl font-bold leading-tight text-[#251E36]">
                {selectedBook.title}
              </h1>

              {/* Summary / Description text */}
              <p className="text-sm leading-relaxed text-[#8E8EA0]">
                {selectedBook.description ||
                  'No summary has been added for this book yet. Click "Ask Libraria about this book" on the left to get an AI overview and study breakdown.'}
              </p>

              {/* Divider + Book Information table */}
              <div className="border-t border-gray-200 pt-6">
                <h2 className="text-base font-bold text-[#251E36]">Book Information</h2>

                <dl className="mt-4 space-y-3 text-xs">
                  <div className="grid grid-cols-[140px_1fr] gap-2">
                    <dt className="font-semibold text-[#8E8EA0]">Author</dt>
                    <dd className="font-semibold text-[#4E426D]">
                      {selectedBook.author ?? 'Unknown author'}
                    </dd>
                  </div>

                  <div className="grid grid-cols-[140px_1fr] gap-2">
                    <dt className="font-semibold text-[#8E8EA0]">Publisher</dt>
                    <dd className="text-[#251E36]">{selectedBook.publisher ?? '—'}</dd>
                  </div>

                  <div className="grid grid-cols-[140px_1fr] gap-2">
                    <dt className="font-semibold text-[#8E8EA0]">Edition</dt>
                    <dd className="text-[#251E36]">{selectedBook.edition ?? '—'}</dd>
                  </div>

                  <div className="grid grid-cols-[140px_1fr] gap-2">
                    <dt className="font-semibold text-[#8E8EA0]">Ref / Call No.</dt>
                    <dd className="text-[#251E36]">
                      {selectedBook.format === 'E-Book'
                        ? 'E-Book (Online)'
                        : selectedBook.call_number ?? 'Ask the librarian'}
                    </dd>
                  </div>

                  <div className="grid grid-cols-[140px_1fr] gap-2">
                    <dt className="font-semibold text-[#8E8EA0]">Courses</dt>
                    <dd className="flex flex-wrap gap-1.5">
                      {selectedBook.courses.length === 0 ? (
                        <span className="text-[#8E8EA0]">—</span>
                      ) : (
                        selectedBook.courses.map(c => (
                          <span
                            key={c.id}
                            className="rounded-lg bg-[#EFEAFC] px-2.5 py-0.5 text-[11px] font-semibold text-[#4E426D]"
                          >
                            {c.code} · {c.name}
                          </span>
                        ))
                      )}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

          </div>
        </div>
      </div>
    );
  }

  // ===== VIEW 1: CATEGORIES (COURSES) PAGE (/categories) =====
  if (view === 'categories') {
    const activeCourseObj = courses.find(c => c.code === selectedCourse);

    return (
      <div className="flex-1 overflow-y-scroll bg-white p-6">
        <div className="mx-auto w-full max-w-5xl space-y-6 pt-4">
          {selectedCourse ? (
            /* Course books list */
            <>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <button
                    onClick={() => setSelectedCourse('')}
                    className="mb-2 inline-flex items-center gap-1.5 py-1 text-xs font-semibold text-gray-900 transition hover:text-gray-600 hover:underline"
                  >
                    <ArrowLeftIcon className="h-4 w-4" /> Back to Courses
                  </button>
                  <h2 className="mt-1 text-2xl font-bold text-[#251E36]">
                    {activeCourseObj?.code} · <span className="font-normal text-[#8E8EA0]">{activeCourseObj?.name}</span>
                  </h2>
                </div>

                <PaginationBar
                  page={currentBookPage}
                  totalPages={totalBookPages}
                  onPageChange={setBookPage}
                />
              </div>

              <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">
                {pagedBooks.map((b, idx) => (
                  <BookCard key={b.id} book={b} index={idx} onSelect={setSelectedBook} />
                ))}
              </div>
            </>
          ) : (
            /* Courses list */
            <>
              {/* Course search bar with round magnifying glass button */}
              <div className="flex items-center rounded-full border border-gray-200 bg-white p-1.5 shadow-xs">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search course name or code..."
                  className="w-full bg-transparent px-4 py-2 text-sm text-[#251E36] placeholder-[#8E8EA0] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setCatPage(1)}
                  aria-label="Search"
                  className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-[#4E426D] text-white transition hover:bg-[#3E3457] shadow-xs"
                >
                  <MagnifyingGlassIcon className="h-4 w-4" />
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold text-[#251E36]">Courses</h2>
                  <p className="mt-1 text-xs text-[#8E8EA0]">
                    Select a CCS course below to browse its library books.
                  </p>
                </div>

                <PaginationBar
                  page={currentCatPage}
                  totalPages={totalCatPages}
                  onPageChange={setCatPage}
                />
              </div>

              {isLoading ? (
                <p className="py-12 text-center text-sm text-[#8E8EA0]">Loading courses...</p>
              ) : error ? (
                <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-600">{error}</p>
              ) : pagedCourses.length === 0 ? (
                <p className="py-12 text-center text-sm text-[#8E8EA0]">No matching courses found.</p>
              ) : (
                <>
                <div className="grid grid-cols-[1fr_auto] gap-4 px-2 text-xs text-[#8E8EA0] sm:grid-cols-[1fr_160px_100px_100px]">
                  <span>Course name</span>
                  <span className="sm:text-center">Code</span>
                  <span className="hidden text-center sm:block">Books</span>
                  <span className="hidden text-right sm:block">Department</span>
                </div>

                  <div className="divide-y divide-gray-100">
                    {pagedCourses.map((c, idx) => (
                      <CourseRow
                        key={c.id}
                        course={c}
                        index={idx}
                        onClick={() => {
                          setSearch('');
                          setSelectedCourse(c.code);
                        }}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  // ===== VIEW 2: DISCOVER PAGE (/books) =====
  const isFiltering = text.length > 0 || selectedCourse !== '' || showAllBooks;

  return (
    <div className="flex-1 overflow-y-auto bg-white">
      <div className="mx-auto max-w-5xl px-6 py-6 space-y-10">

        {/* 1. Contained Hero Banner */}
        <div
          className="relative flex min-h-[260px] sm:min-h-[300px] flex-col items-center justify-center overflow-hidden rounded-3xl bg-[#1E1B2E] px-6 py-10 text-center text-white shadow-md"
          style={
            HERO_IMAGE_URL
              ? {
                  backgroundImage: `linear-gradient(rgba(17, 14, 28, 0.7), rgba(17, 14, 28, 0.7)), url(${HERO_IMAGE_URL})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }
              : {
                  background: 'linear-gradient(135deg, #181524 0%, #292342 50%, #1E1B2E 100%)',
                }
          }
        >
          {!HERO_IMAGE_URL && (
            <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none" />
          )}

          <div className="relative z-10 mx-auto w-full max-w-2xl space-y-5">
            <h1 className="text-2xl font-bold tracking-tight text-white uppercase sm:text-4xl leading-tight">
              EXPLORE<br />THE VAST WORLD OF<br />BOOKS
            </h1>

            {/* Pill search bar with round magnifying glass icon button */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setShowAllBooks(true);
                collectionRef.current?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="mx-auto flex w-full max-w-lg items-center rounded-full bg-white p-1.5 shadow-xl"
            >
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search books, authors, or topics..."
                className="w-full bg-transparent px-4 py-2 text-sm text-[#251E36] placeholder-[#8E8EA0] focus:outline-none"
              />
              <button
                type="submit"
                aria-label="Search"
                className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-[#4E426D] text-white transition hover:bg-[#3E3457] shadow-xs"
              >
                <MagnifyingGlassIcon className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>

        {!isFiltering && (
          <>
            {/* 2. Stats Section */}
            <div className="py-2">
              <div className="grid grid-cols-3 gap-6 text-left">
                <div>
                  <p className="text-2xl font-bold text-[#251E36] sm:text-4xl">
                    {formatStat(allBooks.length)}
                  </p>
                  <p className="mt-0.5 text-xs font-semibold tracking-wider text-[#4E426D]">
                    Books
                  </p>
                </div>

                <div>
                  <p className="text-2xl font-bold text-[#251E36] sm:text-4xl">
                    {formatStat(courses.length)}
                  </p>
                  <p className="mt-0.5 text-xs font-semibold tracking-wider text-[#4E426D]">
                    Courses
                  </p>
                </div>

                <div>
                  <p className="text-2xl font-bold text-[#251E36] sm:text-4xl">
                    {formatStat(allBooks.reduce((sum, b) => (b.is_available ? sum + (b.copies ?? 1) : sum), 0))}
                  </p>
                  <p className="mt-0.5 text-xs font-semibold tracking-wider text-[#4E426D]">
                    Available 
                    Copies
                  </p>
                </div>
              </div>
            </div>

            {/* 3. Highlight Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <h2 className="text-lg font-bold tracking-tight text-[#4E426D] sm:text-xl whitespace-nowrap">
                  Your College Library, Reimagined
                </h2>
                <div className="h-px flex-1 bg-[#4E426D]" />
              </div>

              <div className="flex flex-col items-start justify-between gap-5 md:flex-row md:items-center">
                <p className="max-w-2xl text-xs sm:text-sm leading-relaxed text-[#8E8EA0]">
                  Explore official textbooks, syllabus references, and e-books mapped directly to your CCS curriculum.
                  From foundational programming and data structures to advanced artificial intelligence and cybersecurity, 
                  discover the right materials or ask Libraria to extract key concepts and guide your coursework.
                </p>

                <button
                  type="button"
                  onClick={() => {
                    setShowAllBooks(true);
                    collectionRef.current?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="whitespace-nowrap rounded-full bg-[#4E426D] px-6 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-[#3E3457]"
                >
                  See Books
                </button>
              </div>
            </div>
          </>
        )}

        {/* 4. Book Catalog & Courses (Scroll Target) */}
        <div ref={collectionRef} className="space-y-10 pt-4">
        {isLoading ? (
          <div className="rounded-2xl bg-white p-12 text-center text-sm text-[#8E8EA0] shadow-xs">
            Loading library catalog...
          </div>
        ) : error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-600">{error}</p>
        ) : isFiltering ? (
          /* Filtered search results */
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setSelectedCourse('');
                  setShowAllBooks(false);
                }}
                className="inline-flex items-center gap-1.5 py-1 text-xs font-semibold text-gray-900 transition hover:text-gray-600 hover:underline"
              >
                <ArrowLeftIcon className="h-4 w-4" /> Back 
              </button>

              <PaginationBar
                page={currentBookPage}
                totalPages={totalBookPages}
                onPageChange={setBookPage}
              />
            </div>

            {filteredBooks.length === 0 ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center text-sm text-[#8E8EA0]">
                No matching books found in the library.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">
                {pagedBooks.map((b, idx) => (
                  <BookCard key={b.id} book={b} index={idx} onSelect={setSelectedBook} />
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Default Curated Sections */
          <>
            {/* Book Collection */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[#251E36]">Book Collection</h2>
                <button
                  onClick={() => setShowAllBooks(true)}
                  className="flex items-center gap-1 text-xs font-semibold text-[#251E36] hover:underline"
                >
                  View all <ChevronRightIcon className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
                {allBooks.slice(0, 4).map((b, idx) => (
                  <BookCard key={b.id} book={b} index={idx} onSelect={setSelectedBook} />
                ))}
              </div>
            </section>

            {/* Courses */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[#251E36]">Courses</h2>
                <button
                  onClick={() => onNavigate && onNavigate('/categories')}
                  className="flex items-center gap-1 text-xs font-semibold text-[#251E36] hover:underline"
                >
                  View All <ChevronRightIcon className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-[1fr_auto] gap-4 px-2 text-xs text-[#8E8EA0] sm:grid-cols-[1fr_160px_100px_100px]">
                <span>Course name</span>
                <span className="sm:text-center">Code</span>
                <span className="hidden text-center sm:block">Books</span>
                <span className="hidden text-right sm:block">Department</span>
              </div>

              <div className="divide-y divide-gray-100">
                {courses.slice(0, 4).map((c, idx) => (
                  <CourseRow
                    key={c.id}
                    course={c}
                    index={idx}
                    onClick={() => setSelectedCourse(c.code)}
                  />
                ))}
              </div>
            </section>
          </>
        )}
        </div>
      </div>
    </div>
  );
};

export default BookSearchPanel;
