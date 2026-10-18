import { useState } from 'react';
import { XMarkIcon, UserCircleIcon } from '@heroicons/react/24/solid';
import { useAuth } from '../../context/AuthContext';

// Shared styles for inputs and labels (same look as the login page)
const INPUT = 'h-9 w-full rounded-lg border-2 border-gray-300 px-3 text-xs focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 disabled:bg-gray-100 disabled:text-gray-500';
const LABEL = 'text-[10px] font-medium uppercase tracking-wider text-gray-700';

// Green "it worked" box or red error box
const Notice = ({ type, text }) =>
  text ? (
    <p
      className={`rounded-lg border px-3 py-2 text-xs ${
        type === 'error' ? 'border-red-200 bg-red-50 text-red-600' : 'border-green-200 bg-green-50 text-green-700'
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
      setMessage({ type: 'success', text: 'Profile saved.' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-3">
      {/* Avatar + role */}
      <div className="flex items-center gap-3 pb-2">
        <UserCircleIcon className="h-12 w-12 text-gray-400" />
        <div>
          <p className="text-sm font-medium text-gray-900">{user.name}</p>
          <span className="text-xs capitalize text-fuchsia-700">{user.role}</span>
        </div>
      </div>

      {/* Full name (can change) */}
      <div className="space-y-1">
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
      <div className="space-y-1">
        <label htmlFor="profile-email" className={LABEL}>Email</label>
        <input id="profile-email" type="email" value={user.email} disabled className={INPUT} />
      </div>

      <Notice type={message.type} text={message.text} />

      <button
        type="submit"
        disabled={isLoading || !fullName.trim() || fullName.trim() === user.name}
        className="h-9 w-full rounded-full bg-amber-600 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-50"
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
      setMessage({ type: 'success', text: 'Password changed.' });
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
    <form onSubmit={handleChange} className="space-y-3">
      <p className="text-sm font-medium text-gray-900">Change password</p>

      <div className="space-y-1">
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

      <div className="space-y-1">
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

      <div className="space-y-1">
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
        className="h-9 w-full rounded-full bg-amber-600 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-50"
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
      className={`flex-1 rounded-lg py-1.5 text-xs font-medium ${
        activeTab === name ? 'bg-white text-fuchsia-900 shadow' : 'text-gray-600 hover:text-gray-900'
      }`}
    >
      {label}
    </button>
  );

  return (
    // Dark see-through background. Clicking it closes the popup
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      {/* Popup box. stopPropagation = clicking inside doesn't close it */}
      <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        {/* X button (top right) */}
        <button onClick={onClose} className="absolute right-3 top-3 text-gray-400 hover:text-gray-600">
          <XMarkIcon className="h-5 w-5" />
        </button>

        <h2 className="text-xl font-bold text-gray-900">
          Your <em className="font-normal text-fuchsia-700">account</em>
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
