import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeftIcon, PlusIcon } from '@heroicons/react/24/solid';
import { useAuth } from '../../context/AuthContext';

// Shared styles (same look as the login page)
const INPUT = 'h-9 w-full rounded-lg border-2 border-gray-300 px-3 text-xs focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50';
const ROLES = ['user', 'librarian', 'admin'];

const AdminUsersPage = () => {
  const { user, authFetch } = useAuth();

  const [users, setUsers] = useState([]);            // every account from the backend
  const [isLoading, setIsLoading] = useState(true);  // true while the list is loading
  const [message, setMessage] = useState({ type: '', text: '' }); // green/red box at the top
  const [showForm, setShowForm] = useState(false);   // true = "New account" form is open
  const [form, setForm] = useState({ full_name: '', email: '', password: '', role: 'librarian' });

  // Show a green (success) or red (error) message
  const showMessage = (type, text) => setMessage({ type, text });

  // ===== LOAD the list of users =====
  const loadUsers = async () => {
    setIsLoading(true);
    try {
      setUsers(await authFetch('/api/admin/users', 'GET'));
    } catch (err) {
      showMessage('error', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Runs once when the page opens
  useEffect(() => {
    loadUsers();
  }, []);

  // Put one updated user back into the list (so the table refreshes without reloading everything)
  const replaceUser = (updated) => setUsers(prev => prev.map(u => (u.id === updated.id ? updated : u)));

  // ===== ACTIONS on one user =====
  const changeRole = async (target, role) => {
    try {
      replaceUser(await authFetch(`/api/admin/users/${target.id}/role`, 'PATCH', { role }));
      showMessage('success', `${target.full_name} is now ${role}.`);
    } catch (err) {
      showMessage('error', err.message);
    }
  };

  const toggleActive = async (target) => {
    try {
      const updated = await authFetch(`/api/admin/users/${target.id}/status`, 'PATCH', { is_active: !target.is_active });
      replaceUser(updated);
      showMessage('success', `${target.full_name} is now ${updated.is_active ? 'active' : 'deactivated'}.`);
    } catch (err) {
      showMessage('error', err.message);
    }
  };

  const resetPassword = async (target) => {
    // Simple browser popup that asks for the new password (Cancel = null)
    const newPassword = window.prompt(`New password for ${target.full_name} (at least 8 characters):`);
    if (!newPassword) return;
    try {
      await authFetch(`/api/admin/users/${target.id}/reset-password`, 'POST', { new_password: newPassword });
      showMessage('success', `Password reset for ${target.full_name}. Tell them their new password.`);
    } catch (err) {
      showMessage('error', err.message);
    }
  };

  // ===== CREATE a new account =====
  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const created = await authFetch('/api/admin/users', 'POST', form);
      setUsers(prev => [created, ...prev]);  // newest at the top
      showMessage('success', `Account created for ${created.full_name}.`);
      setForm({ full_name: '', email: '', password: '', role: 'librarian' }); // clear the form
      setShowForm(false);
    } catch (err) {
      showMessage('error', err.message);
    }
  };

  // Update one box of the form (name, email, password, or role)
  const updateForm = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center gap-4">
          <Link to="/chat" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
            <ArrowLeftIcon className="h-4 w-4" /> Back to chat
          </Link>
          <h1 className="text-xl font-bold text-gray-900">
            <span className="text-fuchsia-700">Libraria</span> Admin
          </h1>
        </div>
        <span className="text-xs text-gray-500">Signed in as {user.name}</span>
      </header>

      <main className="mx-auto max-w-5xl space-y-4 p-6">
        {/* Title + New account button */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Manage users</h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1 rounded-full bg-amber-600 px-4 py-2 text-xs font-medium text-white hover:bg-amber-700"
          >
            <PlusIcon className="h-4 w-4" /> New account
          </button>
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

        {/* New account form (only when the button was clicked) */}
        {showForm && (
          <form onSubmit={handleCreate} className="grid gap-3 rounded-2xl border border-gray-200 bg-white p-4 sm:grid-cols-5">
            <input placeholder="Full name" value={form.full_name} onChange={updateForm('full_name')} className={INPUT} required />
            <input placeholder="Email" type="email" value={form.email} onChange={updateForm('email')} className={INPUT} required />
            <input placeholder="Password (8+ characters)" type="password" value={form.password} onChange={updateForm('password')} className={INPUT} required />
            <select value={form.role} onChange={updateForm('role')} className={INPUT}>
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <button type="submit" className="h-9 rounded-full bg-fuchsia-700 text-xs font-medium text-white hover:bg-fuchsia-800">
              Create
            </button>
          </form>
        )}

        {/* Users table */}
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-400">Loading users...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-400">No users yet.</td></tr>
              ) : (
                // One row per account
                users.map(u => (
                  <tr key={u.id} className="border-b border-gray-100 last:border-0">
                    {/* Name + email */}
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">
                        {u.full_name} {u.id === user.id && <span className="text-xs text-gray-400">(you)</span>}
                      </p>
                      <p className="text-xs text-gray-500">{u.email}</p>
                    </td>

                    {/* Role dropdown (changing it saves right away) */}
                    <td className="px-4 py-3">
                      <select
                        value={u.role}
                        onChange={(e) => changeRole(u, e.target.value)}
                        className="rounded-lg border border-gray-300 px-2 py-1 text-xs capitalize"
                      >
                        {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </td>

                    {/* Active / Deactivated badge */}
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          u.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
                        }`}
                      >
                        {u.is_active ? 'Active' : 'Deactivated'}
                      </span>
                    </td>

                    {/* Buttons */}
                    <td className="space-x-2 whitespace-nowrap px-4 py-3 text-right">
                      <button onClick={() => resetPassword(u)} className="rounded-lg px-2 py-1 text-xs text-gray-700 hover:bg-gray-100">
                        Reset password
                      </button>
                      <button
                        onClick={() => toggleActive(u)}
                        className={`rounded-lg px-2 py-1 text-xs ${
                          u.is_active ? 'text-red-600 hover:bg-red-50' : 'text-green-700 hover:bg-green-50'
                        }`}
                      >
                        {u.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
};

export default AdminUsersPage;
