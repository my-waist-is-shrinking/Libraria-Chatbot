import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import {
  Bars3Icon,
  BookOpenIcon,
  Cog6ToothIcon,
  EllipsisVerticalIcon,
  HomeIcon,
  PencilSquareIcon,
  Squares2X2Icon,
  TrashIcon,
  UserGroupIcon,
  XMarkIcon,
} from '@heroicons/react/20/solid';
import { useAuth } from '../../context/AuthContext';

// Pin icon for pinned chat items in sidebar
const PinIcon = ({ className = 'h-4 w-4', filled = false }) => (
  <svg
    viewBox="0 0 24 24"
    fill={filled ? 'currentColor' : 'none'}
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <line x1="12" y1="17" x2="12" y2="22" />
    <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a1 1 0 0 0 0-2H8a1 1 0 0 0 0 2h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" />
  </svg>
);

const Sidebar = ({
  sidebarOpen,
  setSidebarOpen,
  mobileMenuOpen,
  setMobileMenuOpen,
  chats,
  setChats,
  activeChatId,
  openChat,
  handleNewChat,
  setChatToDelete,
  setShowLogin,
  setAccountTab,
}) => {
  const { user, authFetch } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname;

  // Staff check for librarian / admin views
  const isStaff = user?.role === 'librarian' || user?.role === 'admin';

  // Pinned chat IDs saved per user in localStorage
  const [pinnedChatIds, setPinnedChatIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(`libraria_pinned_${user?.id}`) || '[]');
    } catch {
      return [];
    }
  });

  // Inline rename state
  const [renamingId, setRenamingId] = useState(null);
  const [renameTitle, setRenameTitle] = useState('');

  // Hover tooltip popup for truncated titles
  const [hoveredTitle, setHoveredTitle] = useState(null);

  // Sync pinned chats when user changes
  useEffect(() => {
    if (user?.id) {
      try {
        const stored = JSON.parse(localStorage.getItem(`libraria_pinned_${user.id}`) || '[]');
        setPinnedChatIds(stored);
      } catch {
        setPinnedChatIds([]);
      }
    } else {
      setPinnedChatIds([]);
    }
  }, [user?.id]);

  // Toggle pinning a conversation to the top
  const togglePinChat = (chatId) => {
    setPinnedChatIds((prev) => {
      const updated = prev.includes(chatId) ? prev.filter((id) => id !== chatId) : [...prev, chatId];
      try {
        localStorage.setItem(`libraria_pinned_${user?.id}`, JSON.stringify(updated));
      } catch (err) {
        console.error('Failed to store pinned chat:', err);
      }
      return updated;
    });
  };

  // Start inline rename
  const startRename = (chat) => {
    setRenamingId(chat.id);
    setRenameTitle(chat.title);
  };

  // Save renamed title
  const saveRename = async (chatId) => {
    const trimmed = renameTitle.trim();
    if (!trimmed) {
      setRenamingId(null);
      return;
    }
    try {
      await authFetch(`/api/conversations/${chatId}`, 'PATCH', { title: trimmed });
      setChats((prev) => prev.map((c) => (c.id === chatId ? { ...c, title: trimmed } : c)));
    } catch (err) {
      console.error('Could not rename chat:', err);
    } finally {
      setRenamingId(null);
    }
  };

  // Sort chats: pinned conversations stay on top
  const sortedChats = [...chats].sort((a, b) => {
    const aPinned = pinnedChatIds.includes(a.id);
    const bPinned = pinnedChatIds.includes(b.id);
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;
    return 0;
  });

  // Navigation click helper: navigates and auto-closes mobile drawer
  const handleNavClick = (to) => {
    navigate(to);
    setMobileMenuOpen(false);
  };

  return (
    <>
      {/* ===== MOBILE DRAWER BACKDROP OVERLAY ===== */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 md:hidden"
        />
      )}

      {/* ===== SIDEBAR (sliding drawer on mobile, collapsing rail on desktop) ===== */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-gray-200/60 bg-white transition-all duration-300 ease-in-out shrink-0 overflow-hidden md:static md:translate-x-0 ${
          mobileMenuOpen ? 'w-72 translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'
        } ${sidebarOpen ? 'md:w-64' : 'md:w-16'}`}
      >
        {/* Sidebar header */}
        <div className="flex h-16 items-center justify-between px-3">
          <div
            className={`flex items-center overflow-hidden transition-all duration-300 ease-in-out ${
              mobileMenuOpen || sidebarOpen ? 'w-auto opacity-100' : 'w-0 opacity-0 pointer-events-none'
            }`}
          >
            <span className="pl-2 text-xl font-bold tracking-tight text-gray-900 whitespace-nowrap">
              Libraria
            </span>
          </div>
          <button
            onClick={() => {
              if (window.innerWidth < 768) {
                setMobileMenuOpen(false);
              } else {
                setSidebarOpen(!sidebarOpen);
              }
            }}
            title={mobileMenuOpen ? 'Close menu' : sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-gray-600 hover:bg-gray-200/70 transition-colors"
          >
            <XMarkIcon className="h-5 w-5 md:hidden" />
            <Bars3Icon className="hidden h-5 w-5 md:block" />
          </button>
        </div>

        {/* Role & Page Navigation Icons */}
        <nav className="space-y-1.5 px-2.5">
          {/* 1A. Discover (/books) */}
          <button
            onClick={() => handleNavClick('/books')}
            title="Discover books"
            className={`flex h-11 w-full items-center rounded-xl px-2.5 text-sm font-semibold transition-colors duration-150 ${
              path === '/books'
                ? 'bg-[#EFEAFC] text-[#4E426D] shadow-xs'
                : 'text-[#6B637B] hover:bg-[#EFEAFC]/50 hover:text-[#4E426D]'
            }`}
          >
            <HomeIcon className="h-5 w-5 shrink-0" />
            <span
              className={`overflow-hidden whitespace-nowrap text-left transition-all duration-300 ease-in-out ${
                mobileMenuOpen || sidebarOpen ? 'ml-3 max-w-[160px] opacity-100' : 'ml-0 max-w-0 opacity-0 pointer-events-none'
              }`}
            >
              Discover
            </span>
          </button>

          {/* 1B. Category / Courses (/categories) */}
          <button
            onClick={() => handleNavClick('/categories')}
            title="Browse by course category"
            className={`flex h-11 w-full items-center rounded-xl px-2.5 text-sm font-semibold transition-colors duration-150 ${
              path === '/categories'
                ? 'bg-[#EFEAFC] text-[#4E426D] shadow-xs'
                : 'text-[#6B637B] hover:bg-[#EFEAFC]/50 hover:text-[#4E426D]'
            }`}
          >
            <Squares2X2Icon className="h-5 w-5 shrink-0" />
            <span
              className={`overflow-hidden whitespace-nowrap text-left transition-all duration-300 ease-in-out ${
                mobileMenuOpen || sidebarOpen ? 'ml-3 max-w-[160px] opacity-100' : 'ml-0 max-w-0 opacity-0 pointer-events-none'
              }`}
            >
              Categories
            </span>
          </button>

          {/* 2. Chat / New Chat (/chat) */}
          <button
            onClick={() => {
              handleNewChat();
              setMobileMenuOpen(false);
            }}
            title="New chat"
            className={`flex h-11 w-full items-center rounded-xl px-2.5 text-sm font-semibold transition-colors duration-150 ${
              path === '/chat' && activeChatId === null
                ? 'bg-[#EFEAFC] text-[#4E426D] shadow-xs'
                : 'text-[#6B637B] hover:bg-[#EFEAFC]/50 hover:text-[#4E426D]'
            }`}
          >
            <PencilSquareIcon className="h-5 w-5 shrink-0" />
            <span
              className={`overflow-hidden whitespace-nowrap text-left transition-all duration-300 ease-in-out ${
                mobileMenuOpen || sidebarOpen ? 'ml-3 max-w-[160px] opacity-100' : 'ml-0 max-w-0 opacity-0 pointer-events-none'
              }`}
            >
              New chat
            </span>
          </button>

          {/* 4. Manage Books (/library) — Librarians & Admins */}
          {isStaff && (
            <button
              onClick={() => handleNavClick('/library')}
              title="Manage books"
              className={`flex h-11 w-full items-center rounded-xl px-2.5 text-sm font-semibold transition-colors duration-150 ${
                path === '/library'
                  ? 'bg-[#EFEAFC] text-[#4E426D] shadow-xs'
                  : 'text-[#6B637B] hover:bg-[#EFEAFC]/50 hover:text-[#4E426D]'
              }`}
            >
              <BookOpenIcon className="h-5 w-5 shrink-0" />
              <span
                className={`overflow-hidden whitespace-nowrap text-left transition-all duration-300 ease-in-out ${
                  mobileMenuOpen || sidebarOpen ? 'ml-3 max-w-[160px] opacity-100' : 'ml-0 max-w-0 opacity-0 pointer-events-none'
                }`}
              >
                Manage books
              </span>
            </button>
          )}

          {/* 5. Manage Users (/admin) — Admins only */}
          {user?.role === 'admin' && (
            <button
              onClick={() => handleNavClick('/admin')}
              title="Manage users"
              className={`flex h-11 w-full items-center rounded-xl px-2.5 text-sm font-semibold transition-colors duration-150 ${
                path === '/admin'
                  ? 'bg-[#EFEAFC] text-[#4E426D] shadow-xs'
                  : 'text-[#6B637B] hover:bg-[#EFEAFC]/50 hover:text-[#4E426D]'
              }`}
            >
              <UserGroupIcon className="h-5 w-5 shrink-0" />
              <span
                className={`overflow-hidden whitespace-nowrap text-left transition-all duration-300 ease-in-out ${
                  mobileMenuOpen || sidebarOpen ? 'ml-3 max-w-[160px] opacity-100' : 'ml-0 max-w-0 opacity-0 pointer-events-none'
                }`}
              >
                Manage users
              </span>
            </button>
          )}
        </nav>

        {/* Saved Chats list (shown when expanded on desktop, or inside mobile drawer) */}
        <div
          className={`flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 transition-opacity duration-200 ${
            mobileMenuOpen || sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none select-none'
          }`}
        >
          <div className="min-w-[216px] space-y-1 border-t border-gray-200 pt-3">
            <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[#8E8EA0]">
              Saved chats
            </p>
            {user?.role === 'guest' ? (
              <p className="px-2 text-xs text-gray-400">Log in to save your chat history.</p>
            ) : sortedChats.length === 0 ? (
              <p className="px-2 text-xs text-gray-400">No chats yet.</p>
            ) : (
              sortedChats.map((chat) => {
                const isPinned = pinnedChatIds.includes(chat.id);
                const isRenaming = renamingId === chat.id;

                return (
                  <div
                    key={chat.id}
                    className={`group relative flex items-center justify-between rounded-xl transition-colors ${
                      path === '/chat' && chat.id === activeChatId
                        ? 'bg-[#EFEAFC] font-semibold text-[#4E426D]'
                        : 'text-[#5C5277] hover:bg-gray-100/80 hover:text-[#251E36]'
                    }`}
                  >
                    {isRenaming ? (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          saveRename(chat.id);
                        }}
                        className="flex min-w-0 flex-1 items-center px-2 py-1"
                      >
                        <input
                          type="text"
                          value={renameTitle}
                          onChange={(e) => setRenameTitle(e.target.value)}
                          onBlur={() => saveRename(chat.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Escape') setRenamingId(null);
                          }}
                          autoFocus
                          maxLength={255}
                          className="w-full rounded-lg border border-[#4E426D] bg-white px-2 py-1 text-xs text-[#251E36] shadow-sm focus:outline-none focus:ring-1 focus:ring-[#4E426D]"
                        />
                      </form>
                    ) : (
                      <button
                        onClick={() => {
                          openChat(chat);
                          setMobileMenuOpen(false);
                        }}
                        onMouseEnter={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setHoveredTitle({ title: chat.title, top: rect.top, left: rect.right + 10 });
                        }}
                        onMouseLeave={() => setHoveredTitle(null)}
                        className="flex min-w-0 flex-1 items-center gap-1.5 truncate px-3 py-2 text-left text-xs font-semibold"
                      >
                        {isPinned && <PinIcon className="h-3.5 w-3.5 flex-none text-[#4E426D]" filled />}
                        <span className="truncate">{chat.title}</span>
                      </button>
                    )}

                    {/* Three-dots menu */}
                    <Menu as="div" className="relative flex-none pr-1">
                      <MenuButton
                        onClick={(e) => e.stopPropagation()}
                        aria-label="Chat options"
                        className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 opacity-80 hover:bg-black/5 hover:text-[#251E36] focus:outline-none"
                      >
                        <EllipsisVerticalIcon className="h-4 w-4" />
                      </MenuButton>

                      <MenuItems className="absolute right-0 top-full z-50 mt-1.5 w-44 space-y-0.5 rounded-2xl border border-gray-200 bg-white p-2 shadow-xl focus:outline-none">
                        <MenuItem>
                          <button
                            type="button"
                            onClick={() => togglePinChat(chat.id)}
                            className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-left text-xs font-medium text-[#251E36] hover:bg-[#EFEAFC]/60 hover:font-semibold hover:text-[#4E426D]"
                          >
                            <PinIcon className="h-4 w-4 text-[#8E8EA0]" filled={isPinned} />
                            {isPinned ? 'Unpin chat' : 'Pin chat'}
                          </button>
                        </MenuItem>

                        <MenuItem>
                          <button
                            type="button"
                            onClick={() => startRename(chat)}
                            className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-left text-xs font-medium text-[#251E36] hover:bg-[#EFEAFC]/60 hover:font-semibold hover:text-[#4E426D]"
                          >
                            <PencilSquareIcon className="h-4 w-4 text-[#8E8EA0]" />
                            Rename
                          </button>
                        </MenuItem>

                        <div className="my-1 border-t border-gray-100" />

                        <MenuItem>
                          <button
                            type="button"
                            onClick={() => setChatToDelete(chat)}
                            className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-left text-xs font-medium text-red-600 hover:bg-red-50 hover:font-semibold"
                          >
                            <TrashIcon className="h-4 w-4 text-red-500" />
                            Delete chat
                          </button>
                        </MenuItem>
                      </MenuItems>
                    </Menu>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Bottom settings button */}
        <div className="border-t border-gray-200 p-2.5">
          <button
            onClick={() => {
              if (user?.role === 'guest') setShowLogin(true);
              else setAccountTab('settings');
              setMobileMenuOpen(false);
            }}
            title={user?.role === 'guest' ? 'Log in' : 'Settings'}
            className="flex h-11 w-full items-center rounded-xl px-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-200/70 transition-colors duration-150"
          >
            <Cog6ToothIcon className="h-5 w-5 shrink-0" />
            <span
              className={`overflow-hidden whitespace-nowrap text-left transition-all duration-300 ease-in-out ${
                mobileMenuOpen || sidebarOpen ? 'ml-3 max-w-[160px] opacity-100' : 'ml-0 max-w-0 opacity-0 pointer-events-none'
              }`}
            >
              Settings
            </span>
          </button>
        </div>
      </aside>

      {/* Floating full-title tooltip on hover */}
      {hoveredTitle && (
        <div
          className="fixed z-50 max-w-xs rounded-xl border border-gray-700/50 bg-[#251E36] px-3.5 py-2.5 text-xs font-medium text-white shadow-2xl pointer-events-none transition-opacity duration-150"
          style={{
            top: `${hoveredTitle.top}px`,
            left: `${hoveredTitle.left}px`,
            transform: 'translateY(-15%)',
          }}
        >
          <div className="absolute -left-1.5 top-3.5 h-3 w-3 rotate-45 bg-[#251E36]" />
          <p className="leading-relaxed break-words">{hoveredTitle.title}</p>
        </div>
      )}
    </>
  );
};

export default Sidebar;
