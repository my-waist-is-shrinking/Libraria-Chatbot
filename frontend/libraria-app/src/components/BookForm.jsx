import { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/solid';

// Shared styles (same look as the admin page)
const INPUT = 'h-9 w-full rounded-lg border-2 border-gray-300 px-3 text-xs focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50';

// Turn a book from the backend into form values ('' instead of null so the inputs work)
const toForm = (book) => ({
  title: book?.title ?? '',
  author: book?.author ?? '',
  edition: book?.edition ?? '',
  publisher: book?.publisher ?? '',
  call_number: book?.call_number ?? '',
  format: book?.format ?? 'Print',
  description: book?.description ?? '',
  is_available: book?.is_available ?? true,
  copies: book?.copies ?? 1,                // new books start with 1 copy
  course_ids: book?.courses.map(c => c.id) ?? [],
});

// Popup form for adding a new book (book = null) or editing one (book = the book)
const BookForm = ({ book, courses, onSave, onClose }) => {
  const [form, setForm] = useState(toForm(book));
  const [error, setError] = useState('');           // red message inside the popup
  const [isSaving, setIsSaving] = useState(false);  // true while waiting for the backend

  // Update one text box / dropdown
  const updateForm = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  // Tick / untick one course checkbox
  const toggleCourse = (id) =>
    setForm(prev => ({
      ...prev,
      course_ids: prev.course_ids.includes(id)
        ? prev.course_ids.filter(c => c !== id)  // was ticked: remove it
        : [...prev.course_ids, id],              // wasn't ticked: add it
    }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSaving(true);

    // Empty boxes become null (= "no value" in the database)
    const clean = (value) => (value.trim() === '' ? null : value.trim());
    const data = {
      title: form.title.trim(),
      author: clean(form.author),
      edition: clean(form.edition),
      publisher: clean(form.publisher),
      call_number: clean(form.call_number),
      format: form.format,
      description: clean(form.description),
      is_available: form.is_available,
      copies: Number(form.copies),          // the box gives text ("3"), the backend wants a number (3)
      course_ids: form.course_ids,
    };

    try {
      await onSave(data);   // the page sends it to the backend
      onClose();            // close only if saving worked
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    // Dark see-through background behind the popup
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form onSubmit={handleSubmit} className="max-h-[90vh] w-full max-w-2xl space-y-4 overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        {/* Title + close (X) button */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">{book ? 'Edit book' : 'Add book'}</h3>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}

        {/* Book details */}
        <div className="grid gap-3 sm:grid-cols-2">
          <input placeholder="Title *" value={form.title} onChange={updateForm('title')} className={`${INPUT} sm:col-span-2`} required />
          <input placeholder="Author" value={form.author} onChange={updateForm('author')} className={INPUT} />
          <input placeholder="Publisher" value={form.publisher} onChange={updateForm('publisher')} className={INPUT} />
          <input placeholder="Edition (e.g. 3rd)" value={form.edition} onChange={updateForm('edition')} className={INPUT} />
          <input placeholder="Call number (e.g. QA76.73 .P98)" value={form.call_number} onChange={updateForm('call_number')} className={INPUT} />

          {/* Print or E-Book */}
          <select value={form.format} onChange={updateForm('format')} className={INPUT}>
            <option value="Print">Print</option>
            <option value="E-Book">E-Book</option>
          </select>

          {/* Number of copies (0 or more) */}
          <input
            type="number"
            min="0"
            placeholder="Copies"
            title="How many copies the library owns"
            value={form.copies}
            onChange={updateForm('copies')}
            className={INPUT}
            required
          />

          {/* Available checkbox */}
          <label className="flex items-center gap-2 text-xs text-gray-700">
            <input
              type="checkbox"
              checked={form.is_available}
              onChange={(e) => setForm({ ...form, is_available: e.target.checked })}
              className="h-4 w-4 accent-amber-600"
            />
            Available to borrow
          </label>

          <textarea
            placeholder="Description (what the book is about)"
            value={form.description}
            onChange={updateForm('description')}
            rows={3}
            className="w-full rounded-lg border-2 border-gray-300 px-3 py-2 text-xs focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 sm:col-span-2"
          />
        </div>

        {/* Course checkboxes */}
        <div>
          <p className="mb-2 text-xs font-medium text-gray-700">Courses</p>
          {courses.length === 0 ? (
            <p className="text-xs text-gray-400">No courses yet. Add some in the Courses tab.</p>
          ) : (
            <div className="grid max-h-40 gap-1 overflow-y-auto rounded-lg border border-gray-200 p-2 sm:grid-cols-2">
              {courses.map(c => (
                <label key={c.id} className="flex items-center gap-2 rounded px-1 py-0.5 text-xs text-gray-700 hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={form.course_ids.includes(c.id)}
                    onChange={() => toggleCourse(c.id)}
                    className="h-4 w-4 accent-amber-600"
                  />
                  <span className="font-medium">{c.code}</span> {c.name}
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Cancel / Save */}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-full px-4 py-2 text-xs text-gray-600 hover:bg-gray-100">
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-full bg-fuchsia-700 px-4 py-2 text-xs font-medium text-white hover:bg-fuchsia-800 disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : book ? 'Save changes' : 'Add book'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default BookForm;
