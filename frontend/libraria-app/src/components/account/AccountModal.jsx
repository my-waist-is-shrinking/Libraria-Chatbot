import { useState } from 'react';
import { XMarkIcon, UserCircleIcon } from '@heroicons/react/24/solid';
import { useAuth } from '../../context/AuthContext';

// Shared styles for inputs and labels
const INPUT = 'h-10 w-full rounded-xl border border-gray-200 px-3 text-xs text-[#251E36] focus:border-[#4E426D] focus:outline-none focus:ring-2 focus:ring-[#4E426D]/20 disabled:bg-gray-50 disabled:text-gray-400 transition placeholder:text-gray-400';
const LABEL = 'text-[10px] font-semibold uppercase tracking-wider text-[#8E8EA0]';

// Green "it worked" box or red error box
const Notice = ({ type, text }) =>
  text ? (
    <p
      className={`rounded-xl border px-3 py-2 text-xs font-medium ${
        type === 'error' ? 'border-red-200 bg-red-50 text-red-600' : 'border-emerald-200 bg-emerald-50 text-emerald-700'
      }`}
    >
      {text}
    </p>
  ) : null;

// ===== PROFILE TAB: see your info, change your name =====
const ProfileTab = () => {
  const { user, updateProfile } = useAuth();
  const [fullName, setFullName] = useState(user.name);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    setIsLoading(true);
    try {
      await updateProfile(fullName);
      setMessage({ type: 'success', text: 'Profile saved successfully.' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-4">
      {/* Avatar + role */}
      <div className="flex items-center gap-3 pb-1">
        <UserCircleIcon className="h-12 w-12 text-[#4E426D]/40" />
        <div>
          <p className="text-sm font-semibold text-[#251E36]">{user.name}</p>
          <span className="inline-block mt-0.5 rounded-full bg-[#EFEAFC] px-2.5 py-0.5 text-[11px] font-semibold capitalize text-[#4E426D]">
            {user.role}
          </span>
        </div>
      </div>

      {/* Full name (can change) */}
      <div className="space-y-1.5">
        <label htmlFor="profile-name" className={LABEL}>Full name</label>
        <input
          id="profile-name"
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          disabled={isLoading}
          className={INPUT}
        />
      </div>

      {/* Email (can't change, it's what you log in with) */}
      <div className="space-y-1.5">
        <label htmlFor="profile-email" className={LABEL}>Email</label>
        <input id="profile-email" type="email" value={user.email} disabled className={INPUT} />
      </div>

      <Notice type={message.type} text={message.text} />

      <button
        type="submit"
        disabled={isLoading || !fullName.trim() || fullName.trim() === user.name}
        className="h-10 w-full rounded-xl bg-[#4E426D] text-xs font-semibold text-white shadow-xs transition hover:bg-[#3E3457] disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Saving...' : 'Save changes'}
      </button>
    </form>
  );
};

// ===== SETTINGS TAB: change password =====
const SettingsTab = () => {
  const { changePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');   // "type new password again" box
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    if (newPassword !== confirm) {
      setMessage({ type: 'error', text: "New passwords don't match." });
      return;
    }
    setIsLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      setMessage({ type: 'success', text: 'Password changed successfully.' });
      // Clear the boxes after it works
      setCurrentPassword('');
      setNewPassword('');
      setConfirm('');
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleChange} className="space-y-4">
      <p className="text-xs font-semibold text-[#251E36]">Change password</p>

      <div className="space-y-1.5">
        <label htmlFor="current-password" className={LABEL}>Current password</label>
        <input
          id="current-password"
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          disabled={isLoading}
          className={INPUT}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="new-password" className={LABEL}>New password</label>
        <input
          id="new-password"
          type="password"
          placeholder="At least 8 characters"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          disabled={isLoading}
          className={INPUT}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="confirm-password" className={LABEL}>Confirm new password</label>
        <input
          id="confirm-password"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          disabled={isLoading}
          className={INPUT}
        />
      </div>

      <Notice type={message.type} text={message.text} />

      <button
        type="submit"
        disabled={isLoading || !currentPassword || !newPassword || !confirm}
        className="h-10 w-full rounded-xl bg-[#4E426D] text-xs font-semibold text-white shadow-xs transition hover:bg-[#3E3457] disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Changing...' : 'Change password'}
      </button>
    </form>
  );
};

// Profile + Settings popup shown on top of the chat (so your chats stay open)
// Props: tab = 'profile' or 'settings' (which tab opens first), onClose = hides the popup
const AccountModal = ({ tab = 'profile', onClose }) => {
  const [activeTab, setActiveTab] = useState(tab);

  // One tab button
  const TabButton = ({ name, label }) => (
    <button
      type="button"
      onClick={() => setActiveTab(name)}
      className={`flex-1 rounded-lg py-2 text-xs font-medium transition ${
        activeTab === name
          ? 'bg-white text-[#4E426D] font-semibold shadow-xs'
          : 'text-gray-500 hover:text-[#251E36]'
      }`}
    >
      {label}
    </button>
  );

  return (
    // Dark see-through background. Clicking it closes the popup
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      {/* Popup box. stopPropagation = clicking inside doesn't close it */}
      <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-gray-100" onClick={(e) => e.stopPropagation()}>
        {/* X button (top right) */}
        <button onClick={onClose} className="absolute right-4 top-4 rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition">
          <XMarkIcon className="h-5 w-5" />
        </button>

        <h2 className="text-xl font-bold text-[#251E36]">
          Your <span className="font-semibold text-[#4E426D]">account</span>
        </h2>

        {/* Tabs */}
        <div className="mt-4 flex gap-1 rounded-xl bg-gray-100 p-1">
          <TabButton name="profile" label="Profile" />
          <TabButton name="settings" label="Settings" />
        </div>

        <div className="mt-5">{activeTab === 'profile' ? <ProfileTab /> : <SettingsTab />}</div>
      </div>
    </div>
  );
};

export default AccountModal;
