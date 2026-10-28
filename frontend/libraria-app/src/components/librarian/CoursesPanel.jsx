import { useEffect, useState } from 'react';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import {
  AcademicCapIcon,
  EllipsisVerticalIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  PlusIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../context/AuthContext';

const INPUT =
  'h-10 w-full rounded-xl border border-gray-200 bg-white px-3.5 text-xs text-[#251E36] placeholder-[#8E8EA0] focus:border-[#4E426D] focus:outline-none';

const COURSE_THEMES = [
  { bg: 'bg-[#EFEAFC]', icon: 'text-[#4E426D]' },
  { bg: 'bg-[#FDF0E6]', icon: 'text-[#F99A4B]' },
  { bg: 'bg-[#EAF4FC]', icon: 'text-[#5299E5]' },
  { bg: 'bg-[#E8F8F0]', icon: 'text-[#38B27B]' },
];

const COURSES_PER_PAGE = 10;

// Pagination bar
const PaginationBar = ({ page, totalPages, onPageChange }) => {
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

const CoursesPanel = ({ courses, books, onChanged, showMessage }) => {
  const { authFetch } = useAuth();

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // undefined = drawer closed, null = Add Course, course object = Edit Course
  const [drawerCourse, setDrawerCourse] = useState(undefined);
  const [form, setForm] = useState({ code: '', name: '' });
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const countBooks = (courseId) =>
    books.filter((b) => b.courses.some((c) => c.id === courseId)).length;

  const openAddDrawer = () => {
    setForm({ code: '', name: '' });
    setFormError('');
    setDrawerCourse(null);
  };

  const openEditDrawer = (course) => {
    setForm({ code: course.code, name: course.name });
    setFormError('');
    setDrawerCourse(course);
  };

  const closeDrawer = () => {
    setDrawerCourse(undefined);
    setFormError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setIsSaving(true);

    const payload = {
      code: form.code.trim(),
      name: form.name.trim(),
    };

    try {
      if (drawerCourse) {
        await authFetch(`/api/library/courses/${drawerCourse.id}`, 'PATCH', payload);
        showMessage('success', 'Course updated. Its books now need an AI update.');
      } else {
        const created = await authFetch('/api/library/courses', 'POST', payload);
        showMessage('success', `Course ${created.code} added.`);
      }
      closeDrawer();
      onChanged();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (course) => {
    if (
      !window.confirm(
        `Delete course ${course.code}? Its books stay, they just lose this course.`
      )
    )
      return;
    try {
      await authFetch(`/api/library/courses/${course.id}`, 'DELETE');
      showMessage('success', `Course ${course.code} deleted.`);
      onChanged();
    } catch (err) {
      showMessage('error', err.message);
    }
  };

  const query = search.trim().toLowerCase();
  const shownCourses = courses.filter(
    (c) =>
      !query ||
      c.code.toLowerCase().includes(query) ||
      c.name.toLowerCase().includes(query)
  );

  const totalPages = Math.max(1, Math.ceil(shownCourses.length / COURSES_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * COURSES_PER_PAGE;
  const paginatedCourses = shownCourses.slice(startIndex, startIndex + COURSES_PER_PAGE);

  return (
    <>
      <div className="space-y-5">
        {/* Header toolbar: Courses Collection + Search + Add Course */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-[#251E36]">Courses Collection</h1>
            <span className="text-sm font-semibold text-[#8E8EA0]">
              {shownCourses.length}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search input */}
            <div className="flex h-10 w-72 items-center rounded-xl bg-white px-3 ring-1 ring-gray-200 focus-within:ring-[#4E426D]">
              <MagnifyingGlassIcon className="h-4 w-4 shrink-0 text-[#8E8EA0]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search a course"
                className="w-full bg-transparent px-2.5 text-xs text-[#251E36] placeholder-[#8E8EA0] focus:outline-none"
              />
            </div>

            {/* Add Course button */}
            <button
              type="button"
              onClick={openAddDrawer}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#4E426D] px-4 text-xs font-semibold text-white shadow-xs hover:bg-[#3E3457]"
            >
              <PlusIcon className="h-4 w-4" />
              Add Course
            </button>
          </div>
        </div>

        {/* Courses table */}
        <div className="overflow-visible">
          <table className="w-full table-fixed text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-[#F9F9FB] text-xs font-medium text-[#8E8EA0]">
                <th className="w-[46%] rounded-l-xl py-3 px-4 font-medium">
                  Course <span className="ml-0.5 text-[10px]">⇅</span>
                </th>
                <th className="w-[22%] py-3 px-3 font-medium">
                  Code <span className="ml-0.5 text-[10px]">⇅</span>
                </th>
                <th className="w-[15%] py-3 px-3 font-medium">
                  Books <span className="ml-0.5 text-[10px]">⇅</span>
                </th>
                <th className="w-[12%] py-3 px-3 font-medium">
                  Department <span className="ml-0.5 text-[10px]">⇅</span>
                </th>
                <th className="w-[5%] rounded-r-xl py-3 pr-3 text-right" />
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {shownCourses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-xs text-[#8E8EA0]">
                    No matching courses found.
                  </td>
                </tr>
              ) : (
                paginatedCourses.map((c, idx) => {
                  const theme = COURSE_THEMES[(startIndex + idx) % COURSE_THEMES.length];
                  const bookCount = countBooks(c.id);

                  return (
                    <tr key={c.id} className="transition hover:bg-gray-50/60">
                      {/* Course icon + Name + Subtitle */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3.5">
                          <div
                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${theme.bg}`}
                          >
                            <AcademicCapIcon className={`h-5 w-5 ${theme.icon}`} />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-xs font-bold text-[#251E36]">
                              {c.name}
                            </p>
                            <p className="mt-0.5 truncate text-[11px] text-[#8E8EA0]">
                              College of Computer Studies
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Course code pill */}
                      <td className="py-3.5 px-3">
                        <span className="inline-flex items-center rounded-full border border-purple-200 bg-[#EFEAFC] px-3 py-1 text-[11px] font-semibold text-[#4E426D]">
                          {c.code}
                        </span>
                      </td>

                      {/* Book count */}
                      <td className="py-3.5 px-3 text-xs font-bold text-[#251E36]">
                        {bookCount} {bookCount === 1 ? 'book' : 'books'}
                      </td>

                      {/* Department pill */}
                      <td className="py-3.5 px-3">
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-[11px] font-semibold text-[#251E36]">
                          CCS
                        </span>
                      </td>

                      {/* Three-dot action menu */}
                      <td className="py-3.5 pr-3 text-right">
                        <Menu as="div" className="relative inline-block text-left">
                          <MenuButton className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#8E8EA0] hover:bg-gray-100 hover:text-[#251E36] focus:outline-none">
                            <EllipsisVerticalIcon className="h-4 w-4" />
                          </MenuButton>

                          <MenuItems className="absolute right-0 top-full z-50 mt-1.5 w-40 space-y-0.5 rounded-2xl border border-gray-200 bg-white p-2 shadow-lg focus:outline-none">
                            <MenuItem>
                              <button
                                type="button"
                                onClick={() => openEditDrawer(c)}
                                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-medium text-[#251E36] hover:bg-[#EFEAFC]/60 hover:font-semibold hover:text-[#4E426D]"
                              >
                                <PencilSquareIcon className="h-4 w-4 text-[#8E8EA0]" />
                                Edit course
                              </button>
                            </MenuItem>

                            <div className="my-1 border-t border-gray-100" />

                            <MenuItem>
                              <button
                                type="button"
                                onClick={() => handleDelete(c)}
                                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-medium text-red-600 hover:bg-red-50 hover:font-semibold"
                              >
                                <TrashIcon className="h-4 w-4 text-red-500" />
                                Delete course
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

        {/* Bottom end pagination */}
        <div className="flex justify-end pt-2 pb-4">
          <PaginationBar
            page={currentPage}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      </div>

      {/* Right-side slide-over drawer for Add / Edit Course */}
      {drawerCourse !== undefined && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/20 p-3"
          onClick={closeDrawer}
        >
          <form
            onSubmit={handleSubmit}
            onClick={(e) => e.stopPropagation()}
            className="flex h-full w-full max-w-md flex-col justify-between rounded-3xl bg-white p-6 shadow-2xl"
          >
            <div className="space-y-5 overflow-y-auto pr-1">
              <div className="flex items-start justify-between border-b border-gray-100 pb-4">
                <div>
                  <h3 className="text-base font-bold text-[#251E36]">
                    {drawerCourse ? 'Edit Course' : 'Add a New Course'}
                  </h3>
                  <p className="mt-0.5 text-xs text-[#8E8EA0]">
                    {drawerCourse
                      ? 'Update the course code and title below'
                      : 'Complete the fields below to add a CCS course'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeDrawer}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-[#8E8EA0] hover:bg-gray-100 hover:text-[#251E36]"
                >
                  ✕
                </button>
              </div>

              {formError && (
                <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
                  {formError}
                </p>
              )}

              {/* Course Code */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[#251E36]">
                  Course Code *
                </label>
                <input
                  placeholder="e.g. CC-COMPROG11"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  className={INPUT}
                  required
                />
              </div>

              {/* Course Name */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[#251E36]">
                  Course Name *
                </label>
                <input
                  placeholder="e.g. Computer Programming 1"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={INPUT}
                  required
                />
              </div>
            </div>

            {/* Bottom buttons */}
            <div className="grid grid-cols-2 gap-3 border-t border-gray-100 pt-4">
              <button
                type="button"
                onClick={closeDrawer}
                className="h-10 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-[#251E36] hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="h-10 rounded-xl bg-[#4E426D] text-xs font-semibold text-white hover:bg-[#3E3457] disabled:opacity-50"
              >
                {isSaving
                  ? 'Saving...'
                  : drawerCourse
                  ? 'Save changes'
                  : 'Add course'}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
};

export default CoursesPanel;
