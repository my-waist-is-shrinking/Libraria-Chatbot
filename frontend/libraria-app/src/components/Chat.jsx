import React, { useState, useRef, useEffect } from 'react';
import ChatMessage from './ChatMessage';
import { PaperAirplaneIcon, PlusIcon, UserCircleIcon } from '@heroicons/react/24/solid';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoginModal from './LoginModal';
import AccountModal from './AccountModal';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { ArrowRightStartOnRectangleIcon, BookOpenIcon, ChevronUpDownIcon, Cog6ToothIcon, UserGroupIcon, UserIcon } from '@heroicons/react/20/solid';

const Chat = () => {
  // Logged-in user (from AuthContext)
  const { user, logout } = useAuth();
  const navigate = useNavigate(); // lets us change pages in code

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
  const [accountTab, setAccountTab] = useState(null); // 'profile' / 'settings' = account popup open, null = closed

  // Loading dots only show in the chat that is waiting (not every chat)
  const isLoading = loadingChatIds.includes(activeChatId);

  // Refs: direct links to elements on the page
  const messagesEndRef = useRef(null);  // invisible div at the bottom
  const inputRef = useRef(null);        // the input box

  // Scroll to the newest message
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Runs when messages, the open chat, or loading changes: scroll down and focus the input
  useEffect(() => {
    scrollToBottom();
    inputRef.current?.focus();
  }, [messages.length, activeChatId, isLoading]);

  // Runs when the user sends a message
  const handleSubmit = async (e) => {
    e.preventDefault();             // stop page reload
    if (!input.trim()) return;      // ignore empty messages

    const userMessage = input.trim();
    setInput('');                   // clear the box

    // No chat open yet? Create one, titled with the first message
    let chatId = activeChatId;
    if (!chatId) {
      chatId = Date.now(); // simple unique id
      setChats(prev => [{ id: chatId, title: userMessage.slice(0, 30), messages: [] }, ...prev]);
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

    try {
      // Send message to the backend
      const response = await fetch('http://localhost:8000/api/chat', {

        
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: userMessage, history }),
      });

       // If the backend had a problem (e.g. Ollama is off), jump to the error message
      if (!response.ok) throw new Error(`Server error ${response.status}`);

      const data = await response.json(); // read the reply
      addMessage(chatId, { text: data.message, isAI: true }); // add AI reply
      
    } catch (error) {
      // Show an error message if the request fails
      console.error('Error:', error);
      addMessage(chatId, { text: 'Sorry, there was an error processing your request.', isAI: true });
    } finally {
      setLoadingChatIds(prev => prev.filter(id => id !== chatId)); // always stop loading (this chat only)
    }
  };

    // New chat: guests with messages get a warning popup first
    const handleNewChat = () => {
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

  // Log out (or "Log in" for guests): clear the session and go to the login page
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    // Row layout: sidebar (left) + chat (right)
    <div className="flex h-screen bg-white">

      {/* ===== SIDEBAR (left) ===== */}
      {/* hidden md:flex = hide on phones, show on bigger screens */}
      <aside className="hidden md:flex w-64 flex-col bg-white border-r border-gray-200">

        {/* Logo */}
        <div className="px-5 py-5">
          <h1 className="text-xl font-bold text-gray-900">
            <span className="text-fuchsia-700">Libraria</span> Book Assistant
          </h1>
        </div>

        {/* New chat button */}
        <div className="px-3">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 border border-gray-300 hover:bg-gray-100"
          >
            <PlusIcon className="h-4 w-4" />
            New chat
          </button>
        </div>

        {/* Chat history: users only (guests aren't saved) */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {user.role === 'guest' ? (
            <p className="text-xs text-gray-400 px-2">Log in to save your chat history.</p>
          ) : chats.length === 0 ? (
            <p className="text-xs text-gray-400 px-2">No chats yet.</p>
          ) : (
            // One button per saved chat. The open one is highlighted
            chats.map(chat => (
              <button
                key={chat.id}
                onClick={() => setActiveChatId(chat.id)}
                className={`w-full truncate rounded-lg px-3 py-2 text-left text-sm ${
                  chat.id === activeChatId ? 'bg-fuchsia-100 text-fuchsia-900' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {chat.title}
              </button>
            ))
          )}
        </div>

        {/* Profile (bottom of sidebar) */}
        <div className="border-t border-gray-200 p-3">
          {user.role === 'guest' ? (
            <>
              <div className="flex items-center gap-3 px-2 py-2">
                <UserCircleIcon className="h-9 w-9 text-gray-400" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
                  {/* Role badge */}
                  <span className="text-xs capitalize text-fuchsia-700">{user.role}</span>
                </div>
              </div>

              {/* Guests: open login popup */}
              <button
                onClick={() => setShowLogin(true)}
                className="w-full mt-1 px-3 py-2 rounded-lg text-sm font-medium text-white bg-amber-600 hover:bg-amber-700"
              >
                Log in
              </button>
            </>
          ) : (
            // Users: click your name to open a menu (Profile, Settings, Manage users for admins, Manage books for staff, Log out)
            <Menu>
              <MenuButton className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-gray-100 focus:outline-none">
                <UserCircleIcon className="h-9 w-9 text-gray-400" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
                  {/* Role badge */}
                  <span className="text-xs capitalize text-fuchsia-700">{user.role}</span>
                </div>
                <ChevronUpDownIcon className="h-5 w-5 text-gray-400" />
              </MenuButton>

              {/* The menu opens above your name */}
              <MenuItems
                anchor="top start"
                className="z-50 w-56 rounded-xl border border-gray-200 bg-white p-1 shadow-lg [--anchor-gap:6px] focus:outline-none"
              >
                <MenuItem>
                  <button
                    onClick={() => setAccountTab('profile')}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 data-[focus]:bg-gray-100"
                  >
                    <UserIcon className="h-4 w-4 text-gray-400" /> Profile
                  </button>
                </MenuItem>
                <MenuItem>
                  <button
                    onClick={() => setAccountTab('settings')}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 data-[focus]:bg-gray-100"
                  >
                    <Cog6ToothIcon className="h-4 w-4 text-gray-400" /> Settings
                  </button>
                </MenuItem>
                {/* Admins only: go to the Manage users page */}
                {user.role === 'admin' && (
                  <MenuItem>
                    <button
                      onClick={() => navigate('/admin')}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 data-[focus]:bg-gray-100"
                    >
                      <UserGroupIcon className="h-4 w-4 text-gray-400" /> Manage users
                    </button>
                  </MenuItem>
                )}
                {/* Librarians + admins: go to the Library page (books, courses, AI index) */}
                {(user.role === 'librarian' || user.role === 'admin') && (
                  <MenuItem>
                    <button
                      onClick={() => navigate('/library')}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 data-[focus]:bg-gray-100"
                    >
                      <BookOpenIcon className="h-4 w-4 text-gray-400" /> Manage books
                    </button>
                  </MenuItem>
                )}
                <div className="my-1 h-px bg-gray-200" />
                <MenuItem>
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 data-[focus]:bg-red-50"
                  >
                    <ArrowRightStartOnRectangleIcon className="h-4 w-4" /> Log out
                  </button>
                </MenuItem>
              </MenuItems>
            </Menu>
          )}
        </div>
      </aside>

      {/* ===== CHAT (right) ===== */}
      {/* flex-1 = take the rest of the width */}
      <main className="flex-1 flex flex-col min-w-0">

        {/* Messages: fills the middle space and scrolls */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {messages.length === 0 ? (
            // Empty state (no messages yet)
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
              <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="text-xl font-medium">Start a conversation</p>
              <p className="mt-2">Ask me anything!</p>
            </div>
          ) : (
            // One bubble per message
            messages.map((message, index) => (
              <ChatMessage key={index} message={message.text} isAI={message.isAI} />
            ))
          )}

          {/* Loading dots while waiting for AI */}
          {isLoading && (
            <div className="flex items-center justify-center space-x-2 p-4">
              <div className="animate-bounce h-2 w-2 bg-fuchsia-500 rounded-full"></div>
              <div className="animate-bounce h-2 w-2 bg-fuchsia-500 rounded-full delay-100"></div>
              <div className="animate-bounce h-2 w-2 bg-fuchsia-500 rounded-full delay-200"></div>
            </div>
          )}

          {/* Scroll target */}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area: stays at the bottom */}
        <div className="flex-none px-4 py-3">
          <form onSubmit={handleSubmit} className="max-w-3xl mx-auto w-full">
            <div className="flex flex-col space-y-2">
              <div className="relative flex items-center">
                {/* Text box */}
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)} // update on each keystroke
                  placeholder="Ask about a book..."
                  className="w-full rounded-xl border-2 border-gray-300 bg-white px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500 focus:ring-opacity-50 transition-all duration-200 pr-12"
                  disabled={isLoading} // can't type while loading
                />
                {/* Send button (sits inside the input on the right) */}
                <button
                  type="submit"
                  disabled={isLoading || !input.trim()} // disabled if loading or empty
                  className="absolute right-1.5 inline-flex items-center justify-center w-8 h-8 rounded-lg text-white bg-amber-600 hover:bg-amber-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  <PaperAirplaneIcon className="h-4 w-4" />
                </button>
              </div>
              <p className="text-xs text-gray-500 text-center">
                Press Enter to send your message
              </p>
            </div>
          </form>
        </div>
      </main>
            {/* ===== DISCARD POPUP (guests only) ===== */}
      {showDiscardPopup && (
        // Dark see-through background covering the whole screen. Clicking it closes the popup
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setShowDiscardPopup(false)}
        >
          {/* The popup box. stopPropagation = clicking inside doesn't close it */}
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-gray-900">Start a new chat?</h2>
              <p className="mt-2 text-sm text-gray-600">
                New chat will clear your ongoing conversation.{' '}
                <span className="font-semibold text-gray-600">Sign up</span> or{' '}
                <span className="font-semibold text-gray-600">Log in</span> to keep your chats saved.
              </p>
            {/* Buttons */}
            <div className="mt-6 flex justify-end gap-2">
              {/* Cancel: close the popup, keep the chat */}
              <button
                onClick={() => setShowDiscardPopup(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              {/* Discard: delete this chat and start a new one */}
              <button
                onClick={confirmDiscard}
                className="px-4 py-2 rounded-lg text-sm font-medium text-red-600 border border-red-200 hover:bg-red-50"
              >
                New chat
              </button>
              {/* Log in: close this popup, open the login popup */}
              <button
                onClick={() => { setShowDiscardPopup(false); setShowLogin(true); }}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-amber-600 hover:bg-amber-700"
              >
                Log in
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