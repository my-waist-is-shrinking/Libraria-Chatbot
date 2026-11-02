import React from 'react';
import Markdown from 'react-markdown';
import { UserIcon, ComputerDesktopIcon } from '@heroicons/react/24/outline';

// How each Markdown piece looks (Tailwind removes default list/bold styles)
const markdownComponents = {
  h3: ({ children }) => <h3 className="text-base font-bold text-[#251E36] mt-4 mb-2.5">{children}</h3>,
  h4: ({ children }) => <h4 className="text-sm font-bold text-[#251E36] mt-3 mb-1.5">{children}</h4>,
  p: ({ children }) => <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
  em: ({ children }) => <em className="italic text-[#8E8EA0]">{children}</em>,
  ul: ({ children }) => <ul className="mb-2 list-disc space-y-1 pl-5">{children}</ul>,
  ol: ({ children }) => <ol className="mb-4 list-decimal space-y-3.5 pl-5">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  hr: () => <hr className="my-3 border-gray-200" />,
};

// One message bubble. Props: message (text), isAI (true = AI, false = user)
const ChatMessage = ({ message, isAI }) => {
  return (
    // Bubble: white card for AI, soft Academy Lavender (#EFEAFC) for the user
    <div
      className={`max-w-4xl mx-auto flex items-start space-x-4 p-6 rounded-3xl ${
        isAI ? 'bg-transparent' : 'bg-[#EFEAFC]'
      }`}
    >
      {/* Icon: Sky Blue (#EAF4FC / #5299E5) for AI, Purple (#4E426D) for User */}
      <div className={`flex-shrink-0 rounded-2xl p-2.5 ${isAI ? 'bg-[#EAF4FC]' : 'bg-[#4E426D]'}`}>
        {isAI ? (
          <ComputerDesktopIcon className="h-6 w-6 text-[#5299E5]" />
        ) : (
          <UserIcon className="h-6 w-6 text-white" />
        )}
      </div>

      {/* Name + message */}
      <div className="flex-1 space-y-2">
        {/* Who sent it */}
        <p className={`text-sm font-bold ${isAI ? 'text-[#5299E5]' : 'text-[#4E426D]'}`}>
          {isAI ? 'Libraria' : 'You'}
        </p>

        {/* The actual message */}
        <div className="text-[#251E36] text-sm leading-relaxed">
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
