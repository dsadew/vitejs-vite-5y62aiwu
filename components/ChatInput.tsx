
import React, { useState, useRef, useEffect } from 'react';
import SendIcon from './icons/SendIcon';
import MicrophoneIcon from './icons/MicrophoneIcon';

// Add SpeechRecognition type declaration for window object
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface ChatInputProps {
  onSendMessage: (text: string) => void;
  isLoading: boolean;
  limitReached: boolean;
  dailyUsage: number;
  limit: number;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, isLoading, limitReached, dailyUsage, limit }) => {
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  const hasSpeechRecognition = typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  useEffect(() => {
    if (!hasSpeechRecognition) {
      console.log("Speech recognition not supported by this browser.");
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    const recognition = recognitionRef.current;

    recognition.continuous = false;
    recognition.lang = 'ar-SA';
    recognition.interimResults = true;
    
    recognition.onstart = () => {
        setIsRecording(true);
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      setText(finalTranscript + interimTranscript);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsRecording(false);
    };
    
    recognition.onend = () => {
      setIsRecording(false);
    };

    return () => {
        recognition?.stop();
    };
  }, [hasSpeechRecognition]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim() && !isLoading && !limitReached) {
      onSendMessage(text);
      setText('');
    }
  };

  const handleMicButtonClick = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
    } else {
      setText(''); // Clear text before starting new recording
      recognitionRef.current?.start();
    }
  };
  
  const placeholderText = isRecording 
    ? "جاري الاستماع..." 
    : limitReached 
    ? "لقد وصلت إلى الحد اليومي." 
    : "اكتب رسالتك أو اضغط على الميكروفون...";

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex items-center gap-2 sm:gap-3">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholderText}
          disabled={isLoading || limitReached || isRecording}
          className="flex-1 bg-gray-800 border border-gray-600 rounded-lg py-3 px-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed"
          autoComplete="off"
        />
        {hasSpeechRecognition && (
          <button
            type="button"
            onClick={handleMicButtonClick}
            disabled={isLoading || limitReached}
            className={`p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors ${isRecording ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse ring-red-500' : 'bg-gray-700 hover:bg-gray-600 text-cyan-400 ring-cyan-500'}`}
            aria-label={isRecording ? "إيقاف التسجيل" : "بدء التسجيل الصوتي"}
          >
            <MicrophoneIcon className="w-6 h-6" />
          </button>
        )}
        <button
          type="submit"
          disabled={isLoading || !text.trim() || limitReached}
          className="bg-cyan-600 text-white p-3 rounded-lg hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
          aria-label="إرسال"
        >
          <SendIcon className="w-6 h-6" />
        </button>
      </form>
      <p className="text-xs text-gray-500 text-center mt-2 px-2">
          {`استخدام اليوم: ${dailyUsage} / ${limit}`}
      </p>
    </div>
  );
};

export default ChatInput;
