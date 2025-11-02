
import React from 'react';
import { Message } from '../types';
import UserIcon from './icons/UserIcon';
import BotIcon from './icons/BotIcon';

interface ChatMessageProps {
  message: Message;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';

  const containerClasses = isUser ? 'justify-end' : 'justify-start';
  const bubbleClasses = isUser 
    ? 'bg-cyan-600 rounded-br-none' 
    : 'bg-gray-700 rounded-bl-none';
  const icon = isUser 
    ? <UserIcon className="w-8 h-8 flex-shrink-0 text-cyan-200" /> 
    : <BotIcon className="w-8 h-8 flex-shrink-0 text-cyan-400" />;

  return (
    <div className={`flex items-start gap-3 ${containerClasses}`}>
      {!isUser && icon}
      <div
        className={`flex flex-col max-w-lg rounded-xl p-3 text-white ${bubbleClasses}`}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
      </div>
      {isUser && icon}
    </div>
  );
};

export default ChatMessage;
