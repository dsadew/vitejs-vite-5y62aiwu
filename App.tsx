import React, { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { Message, ChatHistory, UserData } from './types';
import ChatMessage from './components/ChatMessage';
import ChatInput from './components/ChatInput';
import { sendMessageToGemini } from './services/geminiService';
import BotIcon from './components/icons/BotIcon';
import BrainIcon from './components/icons/BrainIcon';
import InfoIcon from './components/icons/InfoIcon';
import LogoutIcon from './components/icons/LogoutIcon';
import SpeakerOnIcon from './components/icons/SpeakerOnIcon';
import SpeakerOffIcon from './components/icons/SpeakerOffIcon';
import LockScreen from './components/LockScreen';
import { encryptData, decryptData, hashPin } from './utils/crypto';
// Fix: Import the Content type to use for type assertions.
import type { Part, Content } from './types';

const MemoryModal = lazy(() => import('./components/MemoryModal'));
const AboutModal = lazy(() => import('./components/AboutModal'));

const DAILY_MESSAGE_LIMIT = 30;
const PIN_HASH_KEY = 'gemini-chat-pin-hash';
const USER_DATA_KEY = 'gemini-chat-memory-encrypted';
const INITIAL_PROMPT = "أنت تبدأ محادثة جديدة. استخدم دالة getAllUserData لفحص ذاكرة المستخدم. ابحث عن أي أحداث قادمة هذا الأسبوع أو أي معلومات مثيرة للاهتمام. ثم، قم بإنشاء تحية ودية واستباقية. إذا كانت الذاكرة فارغة، قدم تحية ترحيبية قياسية.";

// --- Text-to-Speech Utilities ---
const speak = (text: string) => {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  
  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  
  // Find an Arabic voice
  const voices = window.speechSynthesis.getVoices();
  const arabicVoice = voices.find(voice => voice.lang.startsWith('ar-'));
  
  if (arabicVoice) {
    utterance.voice = arabicVoice;
  } else {
    utterance.lang = 'ar-SA'; // Fallback language
  }
  
  window.speechSynthesis.speak(utterance);
};

const stopSpeech = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }
}

const App: React.FC = () => {
  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [sessionPin, setSessionPin] = useState<string | null>(null);
  const [pinIsSet, setPinIsSet] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // App State
  const [messages, setMessages] = useState<Message[]>([]);
  const [history, setHistory] = useState<ChatHistory>([]);
  const [userData, setUserData] = useState<UserData>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isMemoryModalOpen, setIsMemoryModalOpen] = useState<boolean>(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState<boolean>(false);
  const [isSpeechEnabled, setIsSpeechEnabled] = useState<boolean>(true);

  // Usage Limit State
  const [dailyUsage, setDailyUsage] = useState<number>(0);
  const [limitReached, setLimitReached] = useState<boolean>(false);
  
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Make sure voices are loaded for TTS
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = () => {
            window.speechSynthesis.getVoices();
        };
    }
  }, []);

  // Check for PIN on initial load
  useEffect(() => {
    const storedPinHash = localStorage.getItem(PIN_HASH_KEY);
    setPinIsSet(!!storedPinHash);
  }, []);

  // Scroll to bottom of chat when messages update
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);
  
  // --- Function Call Handlers ---
  const saveUserData = useCallback((key: string, value: string): string => {
    if (!sessionPin) return "خطأ: جلسة غير مصادق عليها.";
    if (Object.keys(userData).length >= 10 && !userData[key]) {
        return 'عذراً، الذاكرة ممتلئة. لا يمكن حفظ أكثر من 10 معلومات. يرجى حذف معلومة قديمة أولاً.';
    }
    const updatedUserData = { ...userData, [key]: value };
    setUserData(updatedUserData);
    const encryptedData = encryptData(updatedUserData, sessionPin);
    localStorage.setItem(USER_DATA_KEY, encryptedData);
    return `تم حفظ المعلومة بنجاح: ${key}`;
  }, [userData, sessionPin]);

  const deleteUserData = useCallback((keyToDelete: string) => {
    if (!sessionPin) return;
    const updatedUserData = { ...userData };
    delete updatedUserData[keyToDelete];
    setUserData(updatedUserData);
    const encryptedData = encryptData(updatedUserData, sessionPin);
    localStorage.setItem(USER_DATA_KEY, encryptedData);
  }, [sessionPin, userData]);

  const getUserData = useCallback((key: string): string => {
    const value = userData[key];
    if (value) {
      return `المعلومة التي وجدتها لـ ${key} هي: ${value}`;
    }
    return `عذراً، لم أجد أي معلومة محفوظة بالمفتاح: ${key}`;
  }, [userData]);
  
  const getAllUserData = useCallback((): string => {
    return JSON.stringify(userData);
  }, [userData]);

  // --- Core Gemini Interaction Logic ---
  const getGeminiResponse = async (prompt: string, currentHistory: ChatHistory): Promise<{ modelResponseText: string, finalHistory: ChatHistory }> => {
    try {
      const geminiResponse = await sendMessageToGemini(currentHistory, prompt);
      const functionCalls = geminiResponse.functionCalls;

      let modelResponseText: string;
      
      // *** FIX START ***
      // Correctly build the history for the next API call.
      // The prompt (whether initial or user-sent) must be included as a 'user' turn
      // to maintain the correct conversation structure for the API.
      let newHistory: ChatHistory = [...currentHistory];
      if (prompt) {
          newHistory.push({ role: 'user', parts: [{ text: prompt }] } as Content);
      }
      // *** FIX END ***

      if (functionCalls && functionCalls.length > 0) {
        const call = functionCalls[0];
        let functionResult = '';

        if (call.name === 'saveUserData' && call.args) {
          functionResult = saveUserData(call.args.key as string, call.args.value as string);
        } else if (call.name === 'getUserData' && call.args) {
          functionResult = getUserData(call.args.key as string);
        } else if (call.name === 'getAllUserData') {
          functionResult = getAllUserData();
        }

        const functionResponsePart: Part[] = [{ functionResponse: { name: call.name, response: { result: functionResult } } }];
        
        const functionResponseResult = await sendMessageToGemini(
          // Fix: Cast the new model message object to 'Content' to avoid type widening issues when creating a new array.
          [...newHistory, { role: 'model', parts: [{ functionCall: call }] } as Content], 
          '',
          functionResponsePart
        );
        modelResponseText = functionResponseResult.text;
        
        newHistory.push(
          { role: 'model', parts: [{ functionCall: call }] },
          { role: 'function', parts: functionResponsePart }
        );
      } else {
        modelResponseText = geminiResponse.text;
      }
      
      newHistory.push({ role: 'model', parts: [{ text: modelResponseText }] });
      return { modelResponseText, finalHistory: newHistory };
    } catch (error) {
      console.error("Error in getGeminiResponse:", error);
      const detailMessage = error instanceof Error ? error.message : 'يرجى المحاولة مرة أخرى.';
      // Re-throw a user-friendly error to be caught by the calling function
      throw new Error(`عذراً، حدث خطأ أثناء الاتصال بالمساعد: ${detailMessage}`);
    }
  };

  const startConversation = useCallback(async () => {
    setIsLoading(true);
    try {
        const { modelResponseText, finalHistory } = await getGeminiResponse(INITIAL_PROMPT, []);
        const initialMessage: Message = { role: 'model', content: modelResponseText };
        setMessages([initialMessage]);
        setHistory(finalHistory);
        if (isSpeechEnabled) {
            speak(modelResponseText);
        }
    } catch (error) {
        const errorMessage: Message = { 
            role: 'model', 
            content: error instanceof Error ? error.message : 'فشل بدء المحادثة.'
        };
        setMessages([errorMessage]);
    } finally {
        setIsLoading(false);
    }
  }, [isSpeechEnabled, getGeminiResponse]);

  // Initializes chat after successful login
  const initializeChat = (decryptedData: UserData) => {
    setUserData(decryptedData);

    try {
      const storedUsage = localStorage.getItem('gemini-daily-usage');
      const today = new Date().toISOString().split('T')[0];
      if (storedUsage) {
          const usageData = JSON.parse(storedUsage);
          if (usageData.date === today) {
              const currentCount = usageData.count || 0;
              setDailyUsage(currentCount);
              if (currentCount >= DAILY_MESSAGE_LIMIT) setLimitReached(true);
          } else {
              localStorage.setItem('gemini-daily-usage', JSON.stringify({ count: 0, date: today }));
              setDailyUsage(0);
          }
      } else {
          localStorage.setItem('gemini-daily-usage', JSON.stringify({ count: 0, date: today }));
      }
    } catch (error) {
      console.error("Failed to process daily usage from localStorage", error);
    }

    startConversation();
  };

  // --- Auth Handlers ---
  const handleSetPin = async (pin: string) => {
    const pinHash = await hashPin(pin);
    localStorage.setItem(PIN_HASH_KEY, pinHash);
    const initialEncryptedData = encryptData({}, pin);
    localStorage.setItem(USER_DATA_KEY, initialEncryptedData);
    setSessionPin(pin);
    setIsAuthenticated(true);
    setPinIsSet(true);
    setAuthError(null);
    initializeChat({});
  };

  const handleLogin = async (pin: string) => {
    const storedPinHash = localStorage.getItem(PIN_HASH_KEY);
    const pinHash = await hashPin(pin);
    if (pinHash === storedPinHash) {
      setSessionPin(pin);
      const encryptedData = localStorage.getItem(USER_DATA_KEY);
      const decryptedData = encryptedData ? (decryptData(encryptedData, pin) as UserData | null) : {};
      
      if (decryptedData) {
        setIsAuthenticated(true);
        setAuthError(null);
        initializeChat(decryptedData);
      } else {
        setAuthError("فشل فك تشفير البيانات. قد يكون رمز PIN خاطئًا أو البيانات تالفة.");
        setTimeout(() => setAuthError(null), 3000);
      }
    } else {
      setAuthError("رمز PIN غير صحيح. حاول مرة أخرى.");
      setTimeout(() => setAuthError(null), 3000);
    }
  };

  const handleLogout = () => {
    stopSpeech();
    setIsAuthenticated(false);
    setSessionPin(null);
    setMessages([]);
    setHistory([]);
    setUserData({});
    setDailyUsage(0);
    setLimitReached(false);
    setAuthError(null);
  };
  
  const handleToggleSpeech = () => {
    if (isSpeechEnabled) {
        stopSpeech();
    }
    setIsSpeechEnabled(prev => !prev);
  }

  const handleSendMessage = useCallback(async (text: string) => {
    if (!text.trim() || limitReached) return;

    const userMessage: Message = { role: 'user', content: text };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    const newCount = dailyUsage + 1;
    setDailyUsage(newCount);
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem('gemini-daily-usage', JSON.stringify({ count: newCount, date: today }));

     if (newCount >= DAILY_MESSAGE_LIMIT) {
        setLimitReached(true);
    }

    try {
        const { modelResponseText, finalHistory } = await getGeminiResponse(text, history);
        const modelMessage: Message = { role: 'model', content: modelResponseText };
        setMessages(prev => [...prev, modelMessage]);
        setHistory(finalHistory);
        if (isSpeechEnabled) {
            speak(modelResponseText);
        }
    } catch (error) {
      const errorMessage: Message = { 
        role: 'model', 
        content: error instanceof Error ? error.message : 'عذراً، حدث خطأ غير متوقع.'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      if (newCount >= DAILY_MESSAGE_LIMIT) {
         setTimeout(() => {
            const limitMessage: Message = { role: 'model', content: 'لقد وصلت إلى حد الاستخدام اليومي. يرجى المحاولة مرة أخرى غداً.' };
            setMessages(prev => [...prev, limitMessage]);
            if(isSpeechEnabled) speak(limitMessage.content);
        }, 500);
      }
    }
  }, [history, dailyUsage, limitReached, isSpeechEnabled, getGeminiResponse]);

  if (!isAuthenticated) {
    return (
      <LockScreen
        pinIsSet={pinIsSet}
        onSetPin={handleSetPin}
        onLogin={handleLogin}
        error={authError}
      />
    );
  }

  return (
    <>
      <div className="flex flex-col h-screen bg-gray-900 text-white font-sans">
        <header className="bg-gray-800 p-4 shadow-md flex items-center justify-between border-b border-gray-700">
          <div className="flex items-center">
            <BotIcon className="w-8 h-8 text-cyan-400 mr-3" />
            <h1 className="text-xl font-bold">مساعد الذاكرة بالذكاء الاصطناعي</h1>
          </div>
          <div className="flex items-center gap-2">
             <button
                onClick={() => setIsAboutModalOpen(true)}
                className="p-2 rounded-full hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-colors"
                aria-label="حول التطبيق"
              >
                <InfoIcon className="w-6 h-6 text-cyan-400" />
              </button>
            <button
                onClick={() => setIsMemoryModalOpen(true)}
                className="p-2 rounded-full hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-colors"
                aria-label="إدارة الذاكرة"
              >
                <BrainIcon className="w-6 h-6 text-cyan-400" />
            </button>
            <button
                onClick={handleToggleSpeech}
                className="p-2 rounded-full hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-colors"
                aria-label={isSpeechEnabled ? "إيقاف الصوت" : "تشغيل الصوت"}
              >
                {isSpeechEnabled ? <SpeakerOnIcon className="w-6 h-6 text-cyan-400" /> : <SpeakerOffIcon className="w-6 h-6 text-gray-400" />}
            </button>
            <button
                onClick={handleLogout}
                className="p-2 rounded-full hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
                aria-label="تسجيل الخروج"
              >
                <LogoutIcon className="w-6 h-6 text-red-400" />
            </button>
          </div>
        </header>
        <main ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {messages.map((msg, index) => (
            <ChatMessage key={index} message={msg} />
          ))}
          {isLoading && (
            <div className="flex justify-start">
                <div className="flex items-center space-x-2 bg-gray-800 rounded-lg p-3 max-w-lg">
                    <BotIcon className="w-8 h-8 flex-shrink-0 text-cyan-400" />
                    <div className="flex items-center space-x-1 rtl:space-x-reverse">
                        <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse delay-0"></span>
                        <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse delay-150"></span>
                        <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse delay-300"></span>
                    </div>
                </div>
            </div>
          )}
        </main>
        <footer className="p-4 bg-gray-900 border-t border-gray-700">
          <ChatInput 
            onSendMessage={handleSendMessage} 
            isLoading={isLoading}
            limitReached={limitReached}
            dailyUsage={dailyUsage}
            limit={DAILY_MESSAGE_LIMIT}
          />
        </footer>
      </div>
      <Suspense fallback={null}>
        <MemoryModal 
          isOpen={isMemoryModalOpen}
          onClose={() => setIsMemoryModalOpen(false)}
          userData={userData}
          onDelete={deleteUserData}
        />
        <AboutModal
          isOpen={isAboutModalOpen}
          onClose={() => setIsAboutModalOpen(false)}
        />
      </Suspense>
    </>
  );
};

export default App;
