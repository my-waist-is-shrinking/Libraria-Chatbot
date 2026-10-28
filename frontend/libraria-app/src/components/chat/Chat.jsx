import React, { useState, useRef, useEffect } from 'react';
import ChatMessage from './ChatMessage';
import BookSearchPanel from './BookSearchPanel';
import LibraryPage from '../../pages/librarian/LibraryPage';
import AdminUsersPage from '../../pages/admin/AdminUsersPage';
import Sidebar from './Sidebar';
import { PaperAirplaneIcon, UserCircleIcon } from '@heroicons/react/24/solid';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoginModal from '../account/LoginModal';
import AccountModal from '../account/AccountModal';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';

import {
  ArrowRightStartOnRectangleIcon,
  Bars3Icon,
  ChevronUpDownIcon,
  Cog6ToothIcon,
  MagnifyingGlassIcon,
  TrashIcon,
  UserIcon,
} from '@heroicons/react/20/solid';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const QUICK_PROMPTS = [
  'Recommend a Python programming book',
  'Books for Data Structures and Algorithms',
  'Available AI and Machine Learning books',
];

const Chat = () => {
  // Logged-in user (from AuthContext)
  const { user, logout, authFetch } = useAuth();
  const navigate = useNavigate(); // lets us change pages in code
  const location = useLocation(); // tells us which page is open (/chat, /books, /library, /admin)

  // Left sidebar: false = slim icon rail, true = expanded with labels + chat history
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false); // mobile off-canvas drawer

  // Close mobile drawer automatically when switching pages
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // All conversations: [{ id, title, messages: [...] }]
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null); // which chat is open (null = new chat)

  // Messages of the open chat (empty if it's a new chat)
  const activeChat = chats.find(c => c.id === activeChatId);
  const messages = activeChat ? activeChat.messages : [];

  // Add one message to a specific chat
  const addMessage = (chatId, msg) => {
    setChats(prev => prev.map(c => (c.id === chatId ? { ...c, messages: [...c.messages, msg] } : c)));
  };

  // State: data that changes and re-draws the screen
  const [input, setInput] = useState('');             // text in the input box
  const [loadingChatIds, setLoadingChatIds] = useState([]); // chats still waiting for the AI
  const [showDiscardPopup, setShowDiscardPopup] = useState(false); // true = discard popup is visible
  const [showLogin, setShowLogin] = useState(false);  // true = login popup is visible
  const [chatToDelete, setChatToDelete] = useState(null); // chat object being confirmed for deletion
  const [accountTab, setAccountTab] = useState(null); // 'profile' / 'settings' = account popup open, null = closed

  // Loading dots only show in the chat that is waiting (not every chat)
  const isLoading = loadingChatIds.includes(activeChatId);

  // Refs: direct links to elements on the page
  const messagesEndRef = useRef(null);  // invisible div at the bottom
  const inputRef = useRef(null);        // the input box
  const abortRefs = useRef({});         // stores AbortController per chat so we can stop generation

  const handleStop = () => {
    if (activeChatId && abortRefs.current[activeChatId]) {
      abortRefs.current[activeChatId].abort();
    }
  };
  

  // Scroll to the newest message
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Runs when messages, the open chat, or loading changes: scroll down and focus the input
  useEffect(() => {
    if (location.pathname === '/chat') {
      scrollToBottom();
      inputRef.current?.focus();
    }
  }, [messages.length, activeChatId, isLoading, location.pathname]);

  // Runs when the user changes (log in / log out): load their saved chats for the sidebar
  useEffect(() => {
    // Guests (or nobody) have no saved chats, so keep the list empty
    if (!user || user.role === 'guest') {
      setChats([]);
      return;
    }

    const loadChats = async () => {
      try {
        const saved = await authFetch('/api/conversations'); // newest first, from the backend
        // Messages stay empty for now. They load when the chat is clicked (Step 3)
        setChats(saved.map(c => ({ id: c.id, title: c.title || 'Untitled chat', messages: [], loaded: false })));
      } catch (error) {
        console.error('Could not load chats:', error);
      }
    };
    loadChats();
  }, [user?.id]); // re-run only when a different person logs in

  // Runs when the user sends a message
  const handleSubmit = async (e) => {
    e.preventDefault();             // stop page reload
    if (!input.trim()) return;      // ignore empty messages

    const userMessage = input.trim();
    setInput('');                   // clear the box

    // The id the backend knows about: null = brand-new chat, a number = saved chat to add to
    const conversationId = activeChatId;

    // No chat open yet? Create one, titled with the first message
    let chatId = activeChatId;
    if (!chatId) {
      chatId = Date.now(); // simple unique id
      setChats(prev => [{ id: chatId, title: userMessage.slice(0, 60), messages: [] }, ...prev]);
      setActiveChatId(chatId);
    }

    // Earlier messages of this chat, so the AI remembers the conversation
    // (skips error messages; "assistant" = the AI's name for itself)
    const history = messages
      .filter(m => !m.text.startsWith('Sorry, there was an error'))
      .slice(-6)
      .map(m => ({ role: m.isAI ? 'assistant' : 'user', content: m.text }));

    addMessage(chatId, { text: userMessage, isAI: false }); // add user message
    setLoadingChatIds(prev => [...prev, chatId]); // show loading dots (this chat only)

    const controller = new AbortController();
    abortRefs.current[chatId] = controller;

    try {
      const headers = { 'Content-Type': 'application/json' };
      if (user.role !== 'guest' && user?.token) {
        headers.Authorization = `Bearer ${user.token}`;
      }

      const response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify(
          user.role === 'guest'
            ? { message: userMessage, history }
            : { message: userMessage, history, conversation_id: conversationId }
        ),
        signal: controller.signal,
      });

      if (!response.ok) throw new Error(`Server error ${response.status}`);
      const data = await response.json();

      addMessage(chatId, { text: data.message, isAI: true });

      if (conversationId === null && data.conversation_id != null) {
        const realId = data.conversation_id;
        setChats(prev => prev.map(c => (c.id === chatId ? { ...c, id: realId } : c)));
        setActiveChatId(current => (current === chatId ? realId : current));
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        addMessage(chatId, { text: '*You stopped this response*', isAI: true });
      } else {
        console.error('Error:', error);
        addMessage(chatId, { text: 'Sorry, there was an error processing your request.', isAI: true });
      }
    } finally {
      delete abortRefs.current[chatId];
      setLoadingChatIds(prev => prev.filter(id => id !== chatId));
    }
  };

  // New chat: guests with messages get a warning popup first
  const handleNewChat = () => {
    navigate('/chat');
    if (user.role === 'guest' && messages.length > 0) {
      setShowDiscardPopup(true); // show the popup instead
      return;
    }
    setActiveChatId(null); // users: old chat stays in the sidebar
  };

  // Guest confirmed: delete the current chat and start fresh
  const confirmDiscard = () => {
    setChats(prev => prev.filter(c => c.id !== activeChatId));
    setActiveChatId(null);
    setShowDiscardPopup(false);
  };

  // Open a saved chat. If its messages haven't been fetched yet, get them from the backend first
  const openChat = async (chat) => {
    setActiveChatId(chat.id);
    navigate('/chat');
    if (chat.loaded !== false) return; // already has its messages (or it's a brand-new chat)

    // Reuse the loading dots + disabled input, so the user can't send before the messages arrive
    setLoadingChatIds(prev => [...prev, chat.id]);
    try {
      const saved = await authFetch(`/api/conversations/${chat.id}/messages`); // oldest first
      // The backend uses { role, content }, but our screen uses { text, isAI }
      const loadedMessages = saved.map(m => ({ text: m.content, isAI: m.role === 'assistant' }));
      // Store them on this chat and mark it as loaded so we don't fetch again
      setChats(prev => prev.map(c => (c.id === chat.id ? { ...c, messages: loadedMessages, loaded: true } : c)));
    } catch (error) {
      console.error('Could not load messages:', error);
    } finally {
      setLoadingChatIds(prev => prev.filter(id => id !== chat.id)); // always stop loading
    }
  };

  // Delete a saved chat: confirmed via custom modal
  const confirmDeleteChat = async () => {
    if (!chatToDelete) return;
    try {
      await authFetch(`/api/conversations/${chatToDelete.id}`, 'DELETE');
      setChats(prev => prev.filter(c => c.id !== chatToDelete.id));
      if (activeChatId === chatToDelete.id) setActiveChatId(null);
    } catch (error) {
      console.error('Could not delete chat:', error);
    } finally {
      setChatToDelete(null);
    }
  };

  // Log out (or "Log in" for guests): clear the session and go to the login page
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Role check for sidebar items
  const isStaff = user.role === 'librarian' || user.role === 'admin';
  const path = location.pathname;

  return (
    // Row layout: collapsible left sidebar + right main area (top bar + active page)
    <div className="flex h-screen h-[100dvh] overflow-hidden bg-white">

      {/* ===== SIDEBAR (Off-canvas drawer on mobile, collapsible rail on desktop) ===== */}
      <Sidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        chats={chats}
        setChats={setChats}
        activeChatId={activeChatId}
        openChat={openChat}
        handleNewChat={handleNewChat}
        setChatToDelete={setChatToDelete}
        setShowLogin={setShowLogin}
        setAccountTab={setAccountTab}
      />

      {/* ===== RIGHT SIDE (Top bar + Active Page) ===== */}
      <div className="flex flex-1 flex-col min-w-0 min-h-0 overflow-hidden">

        {/* Top Header Bar */}
        <header className="flex items-center justify-between border-b border-gray-100 bg-white px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            {/* Mobile Hamburger Button (opens off-canvas drawer) */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              title="Open navigation menu"
              className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-600 hover:bg-gray-100 md:hidden transition"
            >
              <Bars3Icon className="h-5 w-5" />
            </button>

            <h1 className="text-xl font-bold tracking-tight text-[#251E36]">
              {path === '/books'
                ? 'Discover'
                : path === '/categories'
                ? 'Categories'
                : path === '/library'
                ? 'Manage Books'
                : path === '/admin'
                ? 'Manage Users'
                : 'Chat'}
            </h1>
          </div>

          {/* Right side: User Profile Menu (or Guest Login button) */}
          <div className="flex items-center gap-3">
            {user.role === 'guest' ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowLogin(true)}
                  className="rounded-xl bg-[#4E426D] px-4.5 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-[#3E3457]"
                >
                  Log in
                </button>
              </div>
            ) : (
              <Menu as="div" className="relative">
                <MenuButton className="flex items-center gap-2.5 rounded-xl bg-white py-1 pl-3 pr-1.5 text-left transition hover:bg-gray-50 focus:outline-none">
                  <div className="text-right">
                    <p className="text-[13px] font-semibold text-[#251E36] leading-tight">{user.name}</p>
                    <p className="text-[11px] font-medium capitalize text-[#4E426D] leading-tight">{user.role}</p>
                  </div>
                  <UserCircleIcon className="h-9 w-9 text-gray-400" />
                </MenuButton>

                <MenuItems
                  className="absolute right-0 top-full z-50 mt-2 w-52 rounded-2xl border border-gray-100 bg-white p-1.5 shadow-xl focus:outline-none"
                >
                  <MenuItem>
                    <button
                      onClick={() => setAccountTab('profile')}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-[#251E36] transition data-[focus]:bg-[#EFEAFC]/70 data-[focus]:text-[#4E426D]"
                    >
                      <UserIcon className="h-4 w-4 text-[#4E426D]" /> Profile
                    </button>
                  </MenuItem>
                  <MenuItem>
                    <button
                      onClick={() => setAccountTab('settings')}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-[#251E36] transition data-[focus]:bg-[#EFEAFC]/70 data-[focus]:text-[#4E426D]"
                    >
                      <Cog6ToothIcon className="h-4 w-4 text-[#4E426D]" /> Settings
                    </button>
                  </MenuItem>
                  <div className="my-1 h-px bg-gray-100" />
                  <MenuItem>
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-red-600 transition data-[focus]:bg-red-50"
                    >
                      <ArrowRightStartOnRectangleIcon className="h-4 w-4 text-red-500" /> Log out
                    </button>
                  </MenuItem>
                </MenuItems>
              </Menu>
            )}
          </div>
        </header>

        {/* ===== MAIN PANEL (switches by URL) ===== */}
        {path === '/books' || path === '/categories' ? (
          <BookSearchPanel
            view={path === '/categories' ? 'categories' : 'discover'}
            onNavigate={navigate}
            onAsk={(question) => {
              setInput(question);        // put the question in the chat box
              handleNewChat(); // switch to /chat and start a brand-new chat
            }}
          />
        ) : path === '/library' && isStaff ? (
          <LibraryPage />
        ) : path === '/admin' && user.role === 'admin' ? (
          <AdminUsersPage />
        ) : (
          /* ===== CHAT VIEW (/chat) ===== */
          <main className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
            {messages.length === 0 ? (
              /* Empty state: centered prompt card like the Dalton screenshot */
              <div className="relative flex flex-1 flex-col items-center justify-center px-4 overflow-hidden">
                {/* Background decorative pattern */}
                <div className="pointer-events-none absolute inset-0 bg-pattern-chat" />

                <div className="relative z-10 w-full max-w-2xl text-center">
                  <h2 className="text-3xl font-bold text-[#251E36] sm:text-4xl">
                    How can I help you today?
                  </h2>
                  <p className="mt-2 text-sm font-semibold text-[#7C7491]">
                    Ask me anything about CCS library books, courses, or topics.
                  </p>

                  {/* Centered prompt card */}
                  <form
                    onSubmit={handleSubmit}
                    className="mt-8 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm focus-within:border-[#4E426D] focus-within:ring-2 focus-within:ring-[#4E426D]/20"
                  >
                    <input
                      ref={inputRef}
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Ask anything about a book or course..."
                      disabled={isLoading}
                      className="w-full border-0 bg-transparent px-2 py-2 text-sm text-[#251E36] placeholder-[#8E8EA0] focus:outline-none"
                    />
                    <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-2">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setInput('/verify ');
                            inputRef.current?.focus();
                          }}
                          title="Search real books by title"
                          className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-[#6B637B] transition hover:bg-[#EFEAFC]/60 hover:text-[#4E426D]"
                        >
                          <MagnifyingGlassIcon className="h-4 w-4 text-[#8E8EA0]" />
                          <span>Verify book in catalog</span>
                        </button>
                      </div>
                      <button
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#4E426D] text-white hover:bg-[#3E3457] disabled:opacity-40"
                      >
                        <PaperAirplaneIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </form>

                  {/* Quick suggestion pills */}
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    {QUICK_PROMPTS.map(prompt => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => {
                          setInput(prompt);
                          inputRef.current?.focus();
                        }}
                        className="rounded-full border border-gray-200/80 bg-white px-3.5 py-1.5 text-xs font-medium text-[#6B637B] shadow-2xs transition hover:border-[#4E426D]/30 hover:bg-[#EFEAFC]/50 hover:text-[#4E426D]"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* Active conversation: scrollable messages + bottom input box */
              <>
                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                  {messages.map((message, index) => (
                    <ChatMessage key={index} message={message.text} isAI={message.isAI} />
                  ))}

                  {/* Loading dots while waiting for AI */}
                  {isLoading && (
                    <div className="flex items-center justify-center space-x-2 p-4">
                      <div className="animate-bounce h-2 w-2 bg-[#4E426D] rounded-full"></div>
                      <div className="animate-bounce h-2 w-2 bg-[#4E426D] rounded-full delay-100"></div>
                      <div className="animate-bounce h-2 w-2 bg-[#4E426D] rounded-full delay-200"></div>
                    </div>
                  )}

                  {/* Scroll target */}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input area at the bottom when chatting */}
                <div className="flex-none px-4 py-3">
                  <form onSubmit={handleSubmit} className="max-w-3xl mx-auto w-full">
                    <div className="flex flex-col space-y-2">
                      <div className="relative flex items-center">
                        <input
                          ref={inputRef}
                          type="text"
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          placeholder="Ask about a book, or type /verify <title> to check the catalog..."
                          className="w-full rounded-xl border-2 border-gray-300 bg-white px-4 py-2.5 text-sm text-[#251E36] placeholder-[#8E8EA0] focus:outline-none focus:border-[#4E426D] focus:ring-2 focus:ring-[#4E426D]/20 transition-all duration-200 pr-12"
                          disabled={isLoading}
                        />
                        {isLoading ? (
                          <button
                            type="button"
                            onClick={handleStop}
                            title="Stop generating"
                            className="absolute right-1.5 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#4E426D] text-white transition-all duration-200 hover:bg-[#3E3457] focus:outline-none"
                          >
                            <span className="h-3 w-3 rounded-xs bg-white" />
                          </button>
                        ) : (
                          <button
                            type="submit"
                            disabled={!input.trim()}
                            className="absolute right-1.5 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#4E426D] text-white transition-all duration-200 hover:bg-[#3E3457] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <PaperAirplaneIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-[#8E8EA0] text-center">
                        Tip: Use{' '}
                        <button
                          type="button"
                          onClick={() => {
                            setInput('/verify ');
                            inputRef.current?.focus();
                          }}
                          className="font-semibold text-[#4E426D] hover:underline"
                        >
                          /verify &lt;title&gt;
                        </button>{' '}
                        (or just{' '}
                        <button
                          type="button"
                          onClick={() => {
                            setInput('/verify');
                            inputRef.current?.focus();
                          }}
                          className="font-semibold text-[#4E426D] hover:underline"
                        >
                          /verify
                        </button>
                        ) to fact-check books directly against the database
                      </p>
                    </div>
                  </form>
                </div>
              </>
            )}
          </main>
        )}
      </div>

      {/* ===== DISCARD POPUP (guests only) ===== */}
      {showDiscardPopup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setShowDiscardPopup(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-[#251E36]">Start a new chat?</h2>
            <p className="mt-2 text-sm text-gray-600">
              New chat will clear your ongoing conversation.{' '}
              <span className="font-semibold text-[#4E426D]">Sign up</span> or{' '}
              <span className="font-semibold text-[#4E426D]">Log in</span> to keep your chats saved.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setShowDiscardPopup(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-100 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmDiscard}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-red-600 border border-red-200 hover:bg-red-50 transition"
              >
                New chat
              </button>
              <button
                onClick={() => { setShowDiscardPopup(false); setShowLogin(true); }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#4E426D] hover:bg-[#3E3457] transition shadow-xs"
              >
                Log in
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== DELETE CHAT CONFIRMATION MODAL ===== */}
      {chatToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setChatToDelete(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
                <TrashIcon className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[#251E36]">Delete chat?</h2>
                <p className="text-xs text-[#8E8EA0]">This action cannot be undone.</p>
              </div>
            </div>

            <p className="mt-3 text-xs leading-relaxed text-[#5C5277]">
              Are you sure you want to delete <span className="font-semibold text-[#251E36]">"{chatToDelete.title}"</span>?
            </p>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setChatToDelete(null)}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-[#251E36] hover:bg-gray-100 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteChat}
                className="rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== LOGIN POPUP ===== */}
      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}

      {/* ===== ACCOUNT POPUP (Profile + Settings) ===== */}
      {accountTab && <AccountModal tab={accountTab} onClose={() => setAccountTab(null)} />}

    </div>
  );
};

export default Chat;
