import React from 'react';
import Markdown from 'react-markdown';
import { UserIcon, ComputerDesktopIcon } from '@heroicons/react/24/outline';

// How each Markdown piece looks (Tailwind removes default list/bold styles)
const markdownComponents = {
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
  ul: ({ children }) => <ul className="mb-2 list-disc space-y-1 pl-5">{children}</ul>,
  ol: ({ children }) => <ol className="mb-2 list-decimal space-y-1 pl-5">{children}</ol>,
  li: ({ children }) => <li>{children}</li>,
};

// One message bubble. Props: message (text), isAI (true = AI, false = user)
const ChatMessage = ({ message, isAI }) => {
  return (
    // Bubble: transparent for AI, light pink for the user
    <div className={`max-w-7xl mx-auto flex items-start space-x-4 p-6 rounded-2xl ${isAI ? 'bg-transparent' : 'bg-fuchsia-50'}`}>

      {/* Icon */}
      <div className={`flex-shrink-0 rounded-full p-2 ${isAI ? 'bg-blue-100' : 'bg-green-100'}`}>
        {isAI ? (
          <ComputerDesktopIcon className="h-6 w-6 text-blue-600" />
        ) : (
          <UserIcon className="h-6 w-6 text-green-600" />
        )}
      </div>

      {/* Name + message */}
      <div className="flex-1 space-y-2">
        {/* Who sent it */}
        <p className={`font-medium ${isAI ? 'text-blue-900' : 'text-green-900'}`}>
          {isAI ? 'Libraria' : 'You'}
        </p>

        {/* The actual message */}
        <div className="text-gray-700 text-base leading-relaxed">
          {isAI ? (
            // AI replies: turn Markdown (**bold**, - lists) into real formatting
            <Markdown components={markdownComponents}>{message}</Markdown>
          ) : (
            // Your messages: show exactly what you typed
            <p className="whitespace-pre-wrap">{message}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;