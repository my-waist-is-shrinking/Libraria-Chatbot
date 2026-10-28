import { useEffect, useState } from 'react';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import {
  EllipsisVerticalIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  UserCircleIcon,
} from '@heroicons/react/20/solid';
import {
  KeyIcon,
  PencilIcon,
  TrashIcon,
  UserIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../context/AuthContext';

const INPUT =
  'h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-xs text-[#251E36] placeholder-[#8E8EA0] focus:border-[#4E426D] focus:outline-none';
const ROLES = ['user', 'librarian', 'admin'];

// Permission pills shown in the Access column per role
const ACCESS_BADGES = {
  admin: [
    { label: 'Admin', style: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
    { label: 'Manage Books', style: 'border-sky-200 bg-sky-50 text-sky-700' },
    { label: 'Manage Users', style: 'border-purple-200 bg-[#EFEAFC] text-[#4E426D]' },
  ],
  librarian: [
    { label: 'Librarian', style: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
    { label: 'Data Export', style: 'border-sky-200 bg-sky-50 text-sky-700' },
    { label: 'Data Import', style: 'border-purple-200 bg-[#EFEAFC] text-[#4E426D]' },
  ],
  user: [
    { label: 'Catalog Access', style: 'border-sky-200 bg-sky-50 text-sky-700' },
    { label: 'Saved Chats', style: 'border-purple-200 bg-[#EFEAFC] text-[#4E426D]' },
  ],
};

// Format ISO date string as "Mar 4, 2024"
const formatDate = (iso) => {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const USERS_PER_PAGE = 10;

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


const AdminUsersPage = () => {
  const { user, authFetch } = useAuth();

  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ full_name: '', email: '', password: '', role: 'librarian' });

  // Search + role filter + checkbox selection
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [search, roleFilter]);

  const [selectedIds, setSelectedIds] = useState([]);

  // Modals for password reset & user activation/deactivation
  const [resetUser, setResetUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');

  const [statusUser, setStatusUser] = useState(null);
  const [statusLoading, setStatusLoading] = useState(false);

  const showMessage = (type, text) => setMessage({ type, text });

  // Load users from backend
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

  useEffect(() => {
    loadUsers();
  }, []);

  const replaceUser = (updated) =>
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));

  // User actions
  const changeRole = async (target, role) => {
    try {
      replaceUser(await authFetch(`/api/admin/users/${target.id}/role`, 'PATCH', { role }));
      showMessage('success', `${target.full_name} is now ${role}.`);
    } catch (err) {
      showMessage('error', err.message);
    }
  };

  const handleConfirmStatus = async () => {
    if (!statusUser) return;
    setStatusLoading(true);
    try {
      const updated = await authFetch(`/api/admin/users/${statusUser.id}/status`, 'PATCH', {
        is_active: !statusUser.is_active,
      });
      replaceUser(updated);
      showMessage(
        'success',
        `${statusUser.full_name} is now ${updated.is_active ? 'active' : 'deactivated'}.`
      );
      setStatusUser(null);
    } catch (err) {
      showMessage('error', err.message);
    } finally {
      setStatusLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 8) {
      setResetError('Password must be at least 8 characters.');
      return;
    }
    setResetLoading(true);
    setResetError('');
    try {
      await authFetch(`/api/admin/users/${resetUser.id}/reset-password`, 'POST', {
        new_password: newPassword,
      });
      showMessage('success', `Password reset successfully for ${resetUser.full_name}.`);
      setResetUser(null);
      setNewPassword('');
    } catch (err) {
      setResetError(err.message);
    } finally {
      setResetLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const created = await authFetch('/api/admin/users', 'POST', form);
      setUsers((prev) => [created, ...prev]);
      showMessage('success', `Account created for ${created.full_name}.`);
      setForm({ full_name: '', email: '', password: '', role: 'librarian' });
      setShowForm(false);
    } catch (err) {
      showMessage('error', err.message);
    }
  };

  const updateForm = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  // Filter users by search text and role
  const query = search.trim().toLowerCase();
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      !query ||
      u.full_name.toLowerCase().includes(query) ||
      u.email.toLowerCase().includes(query);
    const matchesRole = !roleFilter || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  // Paginate users (5 per page)
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / USERS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const pagedUsers = filteredUsers.slice(
    (currentPage - 1) * USERS_PER_PAGE,
    currentPage * USERS_PER_PAGE
  );

  return (
    <div className="flex flex-1 flex-col overflow-y-scroll bg-white">
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col space-y-6 p-6">
        {/* User search bar with round magnifying glass button */}
        <div className="flex items-center rounded-full border border-gray-200 bg-white p-1.5 shadow-xs">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search user name or email..."
            className="w-full bg-transparent px-4 py-2 text-sm text-[#251E36] placeholder-[#8E8EA0] focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setPage(1)}
            aria-label="Search"
            className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-[#4E426D] text-white transition hover:bg-[#3E3457] shadow-xs"
          >
            <MagnifyingGlassIcon className="h-4 w-4" />
          </button>
        </div>

        {/* Page title */}
        <div>
          <h1 className="text-2xl font-bold text-[#251E36]">User management</h1>
          <p className="mt-1 text-xs text-[#8E8EA0]">
            Manage your team members and their account permissions here.
          </p>
        </div>

        {/* Toolbar: count on left, filter + add user on right */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-[#251E36]">All users</h2>
            <span className="text-base font-semibold text-[#8E8EA0]">
              {filteredUsers.length}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Role filter */}
            <Menu as="div" className="relative">
              <MenuButton className="inline-flex h-9 w-24 items-center gap-2 px-3 text-xs font-semibold text-[#251E36] focus:outline-none">
                <svg
                  className="h-4 w-4 text-[#251E36]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M3 6h18M7 12h10M10 18h4" />
                </svg>
                <span className="capitalize">{roleFilter || 'Filters'}</span>
              </MenuButton>

              <MenuItems className="absolute right-0 top-full z-50 mt-1.5 w-36 space-y-0.5 rounded-2xl border border-gray-200 bg-white p-2 shadow-lg focus:outline-none">
                {[
                  { value: '', label: 'All roles' },
                  { value: 'admin', label: 'Admin' },
                  { value: 'librarian', label: 'Librarian' },
                  { value: 'user', label: 'User' },
                ].map((opt) => (
                  <MenuItem key={opt.label}>
                    <button
                      type="button"
                      onClick={() => setRoleFilter(opt.value)}
                      className={`flex w-full items-center rounded-xl px-3 py-2 text-left text-xs transition hover:bg-[#EFEAFC]/60 hover:font-semibold hover:text-[#4E426D] ${
                        roleFilter === opt.value
                          ? 'bg-[#EFEAFC]/60 font-semibold text-[#4E426D]'
                          : 'font-medium text-[#251E36]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  </MenuItem>
                ))}
              </MenuItems>
            </Menu>

            {/* Add user button */}
            <button
              type="button"
              onClick={() => setShowForm(!showForm)}
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#4E426D] px-4 text-xs font-semibold text-white hover:bg-[#3E3457]"
            >
              <PlusIcon className="h-4 w-4" />
              Add user
            </button>
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

        {/* Users table */}
        <div className="overflow-visible">
          <table className="w-full table-fixed text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/80 text-xs font-medium text-[#8E8EA0]">
                <th className="w-[32%] py-3 px-3 font-medium">User name</th>
                <th className="w-[34%] py-3 px-3 font-medium">Access</th>
                <th className="w-[14%] py-3 px-3 font-medium">Status</th>
                <th className="w-[15%] py-3 px-3 font-medium">Date added</th>
                <th className="w-[5%] rounded-r-lg py-3 pr-4 text-right" />
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-[#8E8EA0]">
                    Loading users...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-[#8E8EA0]">
                    No matching users found.
                  </td>
                </tr>
              ) : (
                pagedUsers.map((u) => {                  const badges = ACCESS_BADGES[u.role] || ACCESS_BADGES.user;
                  return (
                    <tr key={u.id} className="transition hover:bg-gray-50/60">

                      {/* Empty avatar + Name + Email */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-3">
                          <UserCircleIcon className="h-10 w-10 shrink-0 text-gray-300" />
                          <div className="min-w-0">
                            <p className="truncate text-xs font-bold text-[#251E36]">
                              {u.full_name}{' '}
                              {u.id === user.id && (
                                <span className="font-normal text-[#8E8EA0]">(you)</span>
                              )}
                            </p>
                            <p className="truncate text-xs text-[#8E8EA0]">{u.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Access badges */}
                      <td className="py-3.5 px-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {badges.map((b) => (
                            <span
                              key={b.label}
                              className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${b.style}`}
                            >
                              {b.label}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Active / Deactivated status */}
                      <td className="py-3.5 px-3 text-xs">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                            u.is_active
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          {u.is_active ? 'Active' : 'Deactivated'}
                        </span>
                      </td>

                      {/* Date added */}
                      <td className="py-3.5 px-3 text-xs font-medium text-[#251E36]">
                        {formatDate(u.created_at)}
                      </td>

                      {/* Three-dot action menu */}
                      <td className="py-3.5 pr-4 text-right">
                        <Menu as="div" className="relative inline-block text-left">
                          <MenuButton className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#8E8EA0] hover:bg-[#EFEAFC] hover:text-[#4E426D] focus:outline-none data-[open]:bg-[#EFEAFC] data-[open]:text-[#4E426D]">
                            <EllipsisVerticalIcon className="h-4 w-4" />
                          </MenuButton>

                          <MenuItems className="absolute right-0 top-full z-50 mt-1.5 w-52 space-y-0.5 rounded-2xl border border-gray-200 bg-white p-2 shadow-lg focus:outline-none">
                            <MenuItem>
                              <button
                                type="button"
                                onClick={() => {
                                  setResetUser(u);
                                  setNewPassword('');
                                  setResetError('');
                                }}
                                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-xs font-medium text-[#251E36] transition-colors data-[focus]:bg-[#EFEAFC] data-[focus]:font-semibold data-[focus]:text-[#4E426D]"
                              >
                                <PencilIcon className="h-4 w-4 text-inherit opacity-75" />
                                <span>Reset password</span>
                              </button>
                            </MenuItem>

                            {/* Hover submenu for role breakdown */}
                            <div className="group/perm relative">
                              <div className="flex w-full cursor-pointer items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-medium text-[#251E36] transition-colors group-hover/perm:bg-[#EFEAFC] group-hover/perm:font-semibold group-hover/perm:text-[#4E426D]">
                                <span className="flex items-center gap-3">
                                  <KeyIcon className="h-4 w-4 text-inherit opacity-75" />
                                  <span>Change permission</span>
                                </span>
                                <span className="text-[10px] capitalize text-[#8E8EA0] group-hover/perm:text-[#4E426D]">
                                  ‹ {u.role}
                                </span>
                              </div>

                              {/* Role popup on hover */}
                              <div className="invisible absolute right-full top-0 z-50 pr-2 opacity-0 transition-all group-hover/perm:visible group-hover/perm:opacity-100">
                                <div className="w-36 space-y-0.5 rounded-2xl border border-gray-200 bg-white p-2 shadow-lg">
                                  {ROLES.map((r) => (
                                    <MenuItem key={r}>
                                      <button
                                        type="button"
                                        onClick={() => changeRole(u, r)}
                                        className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs capitalize transition ${
                                          u.role === r
                                            ? 'bg-[#EFEAFC] font-semibold text-[#4E426D]'
                                            : 'font-medium text-[#251E36] hover:bg-[#EFEAFC]/70 hover:font-semibold hover:text-[#4E426D]'
                                        }`}
                                      >
                                        <span>{r}</span>
                                      </button>
                                    </MenuItem>
                                  ))}
                                </div>
                              </div>
                            </div>

                            <MenuItem>
                              <button
                                type="button"
                                onClick={() => setStatusUser(u)}
                                className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-medium text-[#251E36] transition-colors data-[focus]:bg-red-50 data-[focus]:font-semibold data-[focus]:text-red-600"
                              >
                                <span className="flex items-center gap-3">
                                  <TrashIcon className="h-4 w-4 text-red-500" />
                                  <span>{u.is_active ? 'Deactivate user' : 'Activate user'}</span>
                                </span>
                                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-red-400 text-[10px] font-bold text-white">
                                  !
                                </span>
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

        {/* Bottom pagination */}
        <div className="flex justify-center pt-2 pb-4">
          <PaginationBar
            page={currentPage}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      </main>
                  {/* Add user slide-over popup */}
        {showForm && (
          <div
            className="fixed inset-0 z-50 flex justify-end bg-black/20 p-3"
            onClick={() => setShowForm(false)}
          >
            <form
              onSubmit={handleCreate}
              onClick={(e) => e.stopPropagation()}
              className="flex h-full w-full max-w-md flex-col justify-between rounded-3xl bg-white p-6 shadow-2xl"
            >
              {/* Top header + fields */}
              <div className="space-y-5 overflow-y-auto pr-1">
                <div className="flex items-start justify-between border-b border-gray-100 pb-4">
                  <div>
                    <h3 className="text-base font-bold text-[#251E36]">Add a New User</h3>
                    <p className="mt-0.5 text-xs text-[#8E8EA0]">
                      Complete the fields below to create an account
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-[#8E8EA0] hover:bg-gray-100 hover:text-[#251E36]"
                  >
                    ✕
                  </button>
                </div>

                {/* Role custom dropdown */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[#251E36]">
                    Role
                  </label>
                  <Menu as="div" className="relative">
                    <MenuButton className="flex h-10 w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-3.5 text-xs capitalize text-[#251E36] hover:bg-gray-50 focus:border-[#4E426D] focus:outline-none">
                      <span>{form.role}</span>
                      <span className="text-[10px] text-[#8E8EA0]">▾</span>
                    </MenuButton>

                    <MenuItems className="absolute left-0 top-full z-50 mt-1.5 w-full space-y-0.5 rounded-2xl border border-gray-200 bg-white p-1.5 shadow-lg focus:outline-none">
                      {ROLES.map((r) => (
                        <MenuItem key={r}>
                          <button
                            type="button"
                            onClick={() => setForm({ ...form, role: r })}
                            className={`flex w-full items-center rounded-xl px-3 py-2 text-left text-xs capitalize transition hover:bg-gray-100 ${
                              form.role === r
                                ? 'bg-[#EFEAFC]/60 font-semibold text-[#4E426D]'
                                : 'font-medium text-[#251E36]'
                            }`}
                          >
                            {r}
                          </button>
                        </MenuItem>
                      ))}
                    </MenuItems>
                  </Menu>
                </div>

                {/* Full Name */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[#251E36]">
                    Full Name
                  </label>
                  <input
                    placeholder="Enter full name..."
                    value={form.full_name}
                    onChange={updateForm('full_name')}
                    className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3.5 text-xs text-[#251E36] placeholder-[#8E8EA0] focus:border-[#4E426D] focus:outline-none"
                    required
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[#251E36]">
                    Email Address
                  </label>
                  <input
                    placeholder="Enter email address..."
                    type="email"
                    value={form.email}
                    onChange={updateForm('email')}
                    className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3.5 text-xs text-[#251E36] placeholder-[#8E8EA0] focus:border-[#4E426D] focus:outline-none"
                    required
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[#251E36]">
                    Password
                  </label>
                  <input
                    placeholder="At least 8 characters..."
                    type="password"
                    value={form.password}
                    onChange={updateForm('password')}
                    className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3.5 text-xs text-[#251E36] placeholder-[#8E8EA0] focus:border-[#4E426D] focus:outline-none"
                    required
                  />
                </div>

                {/* Access permissions */}
                <div>
                  <label className="mb-2 block text-xs font-semibold text-[#251E36]">
                    Access Permissions
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {(ACCESS_BADGES[form.role] || ACCESS_BADGES.user).map((b) => (
                      <span
                        key={b.label}
                        className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${b.style}`}
                      >
                        {b.label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bottom buttons */}
              <div className="grid grid-cols-2 gap-3 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="h-10 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-[#251E36] hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-10 rounded-xl bg-[#4E426D] text-xs font-semibold text-white hover:bg-[#3E3457]"
                >
                  Save user
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ===== RESET PASSWORD MODAL ===== */}
        {resetUser && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
            onClick={() => {
              setResetUser(null);
              setNewPassword('');
              setResetError('');
            }}
          >
            <div
              className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-gray-100"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => {
                  setResetUser(null);
                  setNewPassword('');
                  setResetError('');
                }}
                className="absolute right-4 top-4 rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>

              <div className="flex items-center gap-3 pb-1">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EFEAFC] text-[#4E426D]">
                  <KeyIcon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#251E36]">Reset Password</h3>
                  <p className="text-xs text-[#8E8EA0] truncate max-w-[200px]">{resetUser.full_name}</p>
                </div>
              </div>

              <p className="mt-3 text-xs text-gray-600 leading-relaxed">
                Enter a new password for <span className="font-semibold text-[#251E36]">{resetUser.email}</span>. The user will use this new password on their next sign in.
              </p>

              <form onSubmit={handleResetPassword} className="mt-4 space-y-3.5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-[#8E8EA0]">
                    New Password
                  </label>
                  <input
                    type="password"
                    placeholder="At least 8 characters..."
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={resetLoading}
                    autoFocus
                    className="h-10 w-full rounded-xl border border-gray-200 px-3.5 text-xs text-[#251E36] placeholder-[#8E8EA0] focus:border-[#4E426D] focus:outline-none focus:ring-2 focus:ring-[#4E426D]/20 transition"
                    required
                  />
                </div>

                {resetError && (
                  <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
                    {resetError}
                  </p>
                )}

                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setResetUser(null);
                      setNewPassword('');
                      setResetError('');
                    }}
                    className="h-10 rounded-xl border border-gray-200 text-xs font-semibold text-[#251E36] hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={resetLoading || !newPassword || newPassword.length < 8}
                    className="h-10 rounded-xl bg-[#4E426D] text-xs font-semibold text-white shadow-xs transition hover:bg-[#3E3457] disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {resetLoading ? 'Resetting...' : 'Reset Password'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ===== DEACTIVATE / ACTIVATE USER MODAL ===== */}
        {statusUser && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
            onClick={() => setStatusUser(null)}
          >
            <div
              className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-gray-100"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setStatusUser(null)}
                className="absolute right-4 top-4 rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>

              <div className="flex items-center gap-3 pb-1">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                    statusUser.is_active ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
                  }`}
                >
                  {statusUser.is_active ? (
                    <TrashIcon className="h-5 w-5" />
                  ) : (
                    <UserCircleIcon className="h-5 w-5" />
                  )}
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#251E36]">
                    {statusUser.is_active ? 'Deactivate User' : 'Activate User'}
                  </h3>
                  <p className="text-xs text-[#8E8EA0] truncate max-w-[200px]">{statusUser.full_name}</p>
                </div>
              </div>

              <p className="mt-3 text-xs text-gray-600 leading-relaxed">
                {statusUser.is_active ? (
                  <>
                    Are you sure you want to deactivate{' '}
                    <span className="font-semibold text-[#251E36]">{statusUser.full_name}</span>? They will be signed out and unable to log in to Libraria until reactivated.
                  </>
                ) : (
                  <>
                    Are you sure you want to reactivate{' '}
                    <span className="font-semibold text-[#251E36]">{statusUser.full_name}</span>? Their access to Libraria will be fully restored.
                  </>
                )}
              </p>

              <div className="grid grid-cols-2 gap-2.5 pt-5">
                <button
                  type="button"
                  onClick={() => setStatusUser(null)}
                  className="h-10 rounded-xl border border-gray-200 text-xs font-semibold text-[#251E36] hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmStatus}
                  disabled={statusLoading}
                  className={`h-10 rounded-xl text-xs font-semibold text-white shadow-xs transition ${
                    statusUser.is_active
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-[#4E426D] hover:bg-[#3E3457]'
                  } disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  {statusLoading
                    ? 'Updating...'
                    : statusUser.is_active
                    ? 'Deactivate'
                    : 'Activate'}
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
};

export default AdminUsersPage;
