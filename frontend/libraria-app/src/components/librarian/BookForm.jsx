import { useState, useRef } from 'react';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { ArrowUpTrayIcon, PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline';

const INPUT =
  'h-10 w-full rounded-xl border border-gray-200 bg-white px-3.5 text-xs text-[#251E36] placeholder-[#8E8EA0] focus:border-[#4E426D] focus:outline-none';

const toForm = (book) => ({
  title: book?.title ?? '',
  author: book?.author ?? '',
  edition: book?.edition ?? '',
  publisher: book?.publisher ?? '',
  call_number: book?.call_number ?? '',
  format: book?.format ?? 'Print',
  description: book?.description ?? '',
  cover_image: book?.cover_image ?? '',
  is_available: book?.is_available ?? true,
  copies: book?.copies ?? 1,
  course_ids: book?.courses.map((c) => c.id) ?? [],
});

const BookForm = ({ book, courses, onSave, onClose }) => {
  const [form, setForm] = useState(toForm(book));
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const updateForm = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const toggleCourse = (id) =>
    setForm((prev) => ({
      ...prev,
      course_ids: prev.course_ids.includes(id)
        ? prev.course_ids.filter((c) => c !== id)
        : [...prev.course_ids, id],
    }));

  // Place handleFileUpload right here:
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const savedUser = JSON.parse(localStorage.getItem('libraria-user') || '{}');
      const response = await fetch('http://localhost:8000/api/library/upload-cover', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${savedUser.token}`,
        },
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Upload failed');

      setForm((prev) => ({ ...prev, cover_image: data.url }));
    } catch (err) {
      setError(err.message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSaving(true);

    const clean = (value) => (value.trim() === '' ? null : value.trim());
    const data = {
      title: form.title.trim(),
      author: clean(form.author),
      edition: clean(form.edition),
      publisher: clean(form.publisher),
      call_number: clean(form.call_number),
      format: form.format,
      description: clean(form.description),
      cover_image: clean(form.cover_image),
      is_available: form.is_available,
      copies: Number(form.copies),
      course_ids: form.course_ids,
    };

    try {
      await onSave(data);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/20 p-3"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-md flex-col justify-between rounded-3xl bg-white p-6 shadow-2xl"
      >
        {/* Top header + form fields */}
        <div className="space-y-4 overflow-y-auto pr-1">
          <div className="flex items-start justify-between border-b border-gray-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-[#251E36]">
                {book ? 'Edit Book' : 'Add a New Book'}
              </h3>
              <p className="mt-0.5 text-xs text-[#8E8EA0]">
                {book
                  ? 'Update the book details and course assignments below'
                  : 'Complete the fields below to add a book to the catalog'}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[#8E8EA0] hover:bg-gray-100 hover:text-[#251E36]"
            >
              ✕
            </button>
          </div>

          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
              {error}
            </p>
          )}

          {/* Title */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[#251E36]">
              Title *
            </label>
            <input
              placeholder="Enter book title..."
              value={form.title}
              onChange={updateForm('title')}
              className={INPUT}
              required
            />
          </div>

          {/* Cover Image + Format + Copies in a 2-column layout */}
          <div className="flex items-start gap-4">
            {/* Left: Tall Book Cover Preview */}
            <div className="flex flex-col">
              <label className="mb-1.5 block text-xs font-semibold text-[#251E36]">
                Cover Preview
              </label>
              <div className="relative flex aspect-[3/4] h-44 w-32 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 shadow-inner">
                {form.cover_image ? (
                  <>
                    <img
                      src={form.cover_image}
                      alt="Cover preview"
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, cover_image: '' }))}
                      title="Remove image"
                      className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-white transition hover:bg-red-600"
                    >
                      <XMarkIcon className="h-3.5 w-3.5" />
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-1.5 p-2 text-center text-gray-400">
                    <PhotoIcon className="h-8 w-8 text-gray-300" />
                    <span className="text-[10px] leading-tight">No cover uploaded</span>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Upload controls + Format & Copies */}
            <div className="flex flex-1 flex-col justify-between gap-3 pt-0.5">
              {/* Upload & URL */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[#251E36]">
                  Book Cover
                </label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      disabled={isUploading}
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 text-xs font-semibold text-[#251E36] shadow-xs transition hover:bg-[#EFEAFC]/60 hover:text-[#4E426D] disabled:opacity-50"
                    >
                      <ArrowUpTrayIcon className="h-3.5 w-3.5 text-[#4E426D]" />
                      <span>{isUploading ? 'Uploading...' : 'Upload Image'}</span>
                    </button>
                    <span className="text-[11px] text-[#8E8EA0]">or paste URL</span>
                  </div>

                  <input
                    placeholder="https://example.com/cover.jpg"
                    value={form.cover_image}
                    onChange={updateForm('cover_image')}
                    className={INPUT}
                  />
                </div>
              </div>

              {/* Format + Copies */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[#251E36]">
                    Format
                  </label>
                  <Menu as="div" className="relative">
                    <MenuButton className="flex h-10 w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-3 text-xs text-[#251E36] hover:bg-gray-50 focus:border-[#4E426D] focus:outline-none">
                      <span>{form.format}</span>
                      <span className="text-[10px] text-[#8E8EA0]">▾</span>
                    </MenuButton>

                    <MenuItems className="absolute left-0 top-full z-50 mt-1.5 w-full space-y-0.5 rounded-2xl border border-gray-200 bg-white p-1.5 shadow-lg focus:outline-none">
                      {['Print', 'E-Book'].map((fmt) => (
                        <MenuItem key={fmt}>
                          <button
                            type="button"
                            onClick={() => setForm({ ...form, format: fmt })}
                            className={`flex w-full items-center rounded-xl px-3 py-2 text-left text-xs transition hover:bg-[#EFEAFC]/60 hover:font-semibold hover:text-[#4E426D] ${
                              form.format === fmt
                                ? 'bg-[#EFEAFC]/60 font-semibold text-[#4E426D]'
                                : 'font-medium text-[#251E36]'
                            }`}
                          >
                            {fmt}
                          </button>
                        </MenuItem>
                      ))}
                    </MenuItems>
                  </Menu>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[#251E36]">
                    Copies
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="1"
                    value={form.copies}
                    onChange={updateForm('copies')}
                    className={INPUT}
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Availability toggle */}
          <label className="flex cursor-pointer items-center gap-2.5 pt-1 text-xs font-medium text-[#251E36]">
            <input
              type="checkbox"
              checked={form.is_available}
              onChange={(e) => setForm({ ...form, is_available: e.target.checked })}
              className="h-4 w-4 rounded accent-[#4E426D]"
            />
            Available to borrow
          </label>

          {/* Description */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[#251E36]">
              Description
            </label>
            <textarea
              placeholder="What the book is about..."
              value={form.description}
              onChange={updateForm('description')}
              rows={3}
              className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs text-[#251E36] placeholder-[#8E8EA0] focus:border-[#4E426D] focus:outline-none"
            />
          </div>

          {/* Courses */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[#251E36]">
              Courses
            </label>
            {courses.length === 0 ? (
              <p className="text-xs text-[#8E8EA0]">
                No courses yet. Add some in the Courses tab.
              </p>
            ) : (
              <div className="max-h-40 space-y-1 overflow-y-auto rounded-xl border border-gray-200 p-2">
                {courses.map((c) => {
                  const selected = form.course_ids.includes(c.id);
                  return (
                    <label
                      key={c.id}
                      className={`flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs transition ${
                        selected
                          ? 'bg-[#EFEAFC]/60 font-semibold text-[#4E426D]'
                          : 'text-[#251E36] hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleCourse(c.id)}
                        className="h-3.5 w-3.5 shrink-0 rounded accent-[#4E426D]"
                      />
                      <span className="font-semibold">{c.code}</span>
                      <span className="truncate text-[#8E8EA0]">{c.name}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Bottom buttons */}
        <div className="grid grid-cols-2 gap-3 border-t border-gray-100 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-[#251E36] hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="h-10 rounded-xl bg-[#4E426D] text-xs font-semibold text-white hover:bg-[#3E3457] disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : book ? 'Save changes' : 'Add book'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default BookForm;
