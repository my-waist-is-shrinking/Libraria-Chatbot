import { useState } from 'react';
import { PlusIcon } from '@heroicons/react/24/solid';
import { useAuth } from '../context/AuthContext';

// Shared styles (same look as the admin page)
const INPUT = 'h-9 w-full rounded-lg border-2 border-gray-300 px-3 text-xs focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50';

// The "Courses" tab: add, rename, and delete courses
// onChanged = tell the page to reload books + courses (course changes affect books too)
const CoursesPanel = ({ courses, books, onChanged, showMessage }) => {
  const { authFetch } = useAuth();

  const [newCourse, setNewCourse] = useState({ code: '', name: '' });  // the "Add course" boxes
  const [editingId, setEditingId] = useState(null);                    // which row is being renamed
  const [editForm, setEditForm] = useState({ code: '', name: '' });    // that row's boxes

  // How many books use this course (shown in the table)
  const countBooks = (courseId) => books.filter(b => b.courses.some(c => c.id === courseId)).length;

  // ===== ADD a course =====
  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      const created = await authFetch('/api/library/courses', 'POST', newCourse);
      showMessage('success', `Course ${created.code} added.`);
      setNewCourse({ code: '', name: '' });   // clear the boxes
      onChanged();
    } catch (err) {
      showMessage('error', err.message);
    }
  };

  // ===== RENAME a course =====
  const startEdit = (course) => {
    setEditingId(course.id);
    setEditForm({ code: course.code, name: course.name });  // start with the current values
  };

  const saveEdit = async (course) => {
    try {
      await authFetch(`/api/library/courses/${course.id}`, 'PATCH', editForm);
      showMessage('success', 'Course updated. Its books now need an AI update.');
      setEditingId(null);
      onChanged();
    } catch (err) {
      showMessage('error', err.message);
    }
  };

  // ===== DELETE a course =====
  const handleDelete = async (course) => {
    // Browser "Are you sure?" popup (Cancel = stop)
    if (!window.confirm(`Delete course ${course.code}? Its books stay, they just lose this course.`)) return;
    try {
      await authFetch(`/api/library/courses/${course.id}`, 'DELETE');
      showMessage('success', `Course ${course.code} deleted.`);
      onChanged();
    } catch (err) {
      showMessage('error', err.message);
    }
  };

  return (
    <div className="space-y-4">
      {/* Add course form */}
      <form onSubmit={handleAdd} className="grid gap-3 rounded-2xl border border-gray-200 bg-white p-4 sm:grid-cols-[1fr_2fr_auto]">
        <input
          placeholder="Code (e.g. CC-COMPROG11)"
          value={newCourse.code}
          onChange={(e) => setNewCourse({ ...newCourse, code: e.target.value })}
          className={INPUT}
          required
        />
        <input
          placeholder="Name (e.g. Computer Programming 1)"
          value={newCourse.name}
          onChange={(e) => setNewCourse({ ...newCourse, name: e.target.value })}
          className={INPUT}
          required
        />
        <button type="submit" className="flex h-9 items-center justify-center gap-1 rounded-full bg-fuchsia-700 px-4 text-xs font-medium text-white hover:bg-fuchsia-800">
          <PlusIcon className="h-4 w-4" /> Add course
        </button>
      </form>

      {/* Courses table */}
      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500">
            <tr>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Books</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {courses.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-400">No courses yet.</td></tr>
            ) : (
              // One row per course
              courses.map(c => (
                <tr key={c.id} className="border-b border-gray-100 last:border-0">
                  {editingId === c.id ? (
                    // This row is being renamed: show boxes instead of text
                    <>
                      <td className="px-4 py-2">
                        <input value={editForm.code} onChange={(e) => setEditForm({ ...editForm, code: e.target.value })} className={INPUT} />
                      </td>
                      <td className="px-4 py-2">
                        <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className={INPUT} />
                      </td>
                      <td className="px-4 py-2 text-gray-500">{countBooks(c.id)}</td>
                      <td className="space-x-2 whitespace-nowrap px-4 py-2 text-right">
                        <button onClick={() => saveEdit(c)} className="rounded-lg px-2 py-1 text-xs text-green-700 hover:bg-green-50">Save</button>
                        <button onClick={() => setEditingId(null)} className="rounded-lg px-2 py-1 text-xs text-gray-600 hover:bg-gray-100">Cancel</button>
                      </td>
                    </>
                  ) : (
                    // Normal row
                    <>
                      <td className="px-4 py-3 font-medium text-gray-900">{c.code}</td>
                      <td className="px-4 py-3 text-gray-700">{c.name}</td>
                      <td className="px-4 py-3 text-gray-500">{countBooks(c.id)}</td>
                      <td className="space-x-2 whitespace-nowrap px-4 py-3 text-right">
                        <button onClick={() => startEdit(c)} className="rounded-lg px-2 py-1 text-xs text-gray-700 hover:bg-gray-100">Rename</button>
                        <button onClick={() => handleDelete(c)} className="rounded-lg px-2 py-1 text-xs text-red-600 hover:bg-red-50">Delete</button>
                      </td>
                    </>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CoursesPanel;
