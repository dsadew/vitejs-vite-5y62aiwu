import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  lazy,
  Suspense,
} from 'react';
import { Message, ChatHistory, UserData } from './types';
import ChatMessage from './components/ChatMessage';
import ChatInput from './components/ChatInput';
import { sendMessageToGemini } from './services/geminiService';
import BotIcon from './components/icons/BotIcon';
import BrainIcon from './components/icons/BrainIcon';
import InfoIcon from './components/icons/InfoIcon';
import LogoutIcon from './components/icons/LogoutIcon';
import LockScreen from './components/LockScreen';
import { encryptData, decryptData, hashPin } from './utils/crypto';
import type { Part } from './types';

const MemoryModal = lazy(() => import('./components/MemoryModal'));
const AboutModal = lazy(() => import('./components/AboutModal'));

const DAILY_MESSAGE_LIMIT = 30;
const PIN_HASH_KEY = 'gemini-chat-pin-hash';
const USER_DATA_KEY = 'gemini-chat-memory-encrypted';

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

  // Usage Limit State
  const [dailyUsage, setDailyUsage] = useState<number>(0);
  const [limitReached, setLimitReached] = useState<boolean>(false);

  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Check for PIN on initial load
  useEffect(() => {
    const storedPinHash = localStorage.getItem(PIN_HASH_KEY);
    setPinIsSet(!!storedPinHash);
  }, []);

  // Scroll to bottom of chat when messages update
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Initializes the chat interface and loads usage data after successful login
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
          if (currentCount >= DAILY_MESSAGE_LIMIT) {
            setLimitReached(true);
          }
        } else {
          localStorage.setItem(
            'gemini-daily-usage',
            JSON.stringify({ count: 0, date: today })
          );
          setDailyUsage(0);
        }
      } else {
        localStorage.setItem(
          'gemini-daily-usage',
          JSON.stringify({ count: 0, date: today })
        );
      }
    } catch (error) {
      console.error('Failed to process daily usage from localStorage', error);
    }

    setMessages([
      {
        role: 'model',
        content: 'مرحباً! أنا مساعدك الشخصي. كيف يمكنني مساعدتك اليوم؟',
      },
    ]);
  };

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
      if (encryptedData) {
        const decryptedData = decryptData(
          encryptedData,
          pin
        ) as UserData | null;
        if (decryptedData) {
          setIsAuthenticated(true);
          setAuthError(null);
          initializeChat(decryptedData);
        } else {
          setAuthError(
            'فشل فك تشفير البيانات. قد يكون رمز PIN خاطئًا أو البيانات تالفة.'
          );
          setTimeout(() => setAuthError(null), 3000);
        }
      } else {
        setIsAuthenticated(true);
        setAuthError(null);
        initializeChat({});
      }
    } else {
      setAuthError('رمز PIN غير صحيح. حاول مرة أخرى.');
      setTimeout(() => setAuthError(null), 3000);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setSessionPin(null);
    setMessages([]);
    setHistory([]);
    setUserData({});
    setDailyUsage(0);
    setLimitReached(false);
    setAuthError(null);
  };

  const saveUserData = useCallback(
    (key: string, value: string): string => {
      if (!sessionPin) return 'خطأ: جلسة غير مصادق عليها.';
      if (Object.keys(userData).length >= 10 && !userData[key]) {
        return 'عذراً، الذاكرة ممتلئة. لا يمكن حفظ أكثر من 10 معلومات. يرجى حذف معلومة قديمة أولاً.';
      }
      const updatedUserData = { ...userData, [key]: value };
      setUserData(updatedUserData);
      const encryptedData = encryptData(updatedUserData, sessionPin);
      localStorage.setItem(USER_DATA_KEY, encryptedData);
      return `تم حفظ المعلومة بنجاح: ${key}`;
    },
    [userData, sessionPin]
  );

  const deleteUserData = useCallback(
    (keyToDelete: string) => {
      if (!sessionPin) return;
      const updatedUserData = { ...userData };
      delete updatedUserData[keyToDelete];
      setUserData(updatedUserData);
      const encryptedData = encryptData(updatedUserData, sessionPin);
      localStorage.setItem(USER_DATA_KEY, encryptedData);
    },
    [sessionPin, userData]
  );

  const getUserData = useCallback(
    (key: string): string => {
      const value = userData[key];
      if (value) {
        return `المعلومة التي وجدتها لـ ${key} هي: ${value}`;
      }
      return `عذراً، لم أجد أي معلومة محفوظة بالمفتاح: ${key}`;
    },
    [userData]
  );

  const handleSendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || limitReached) return;

      const userMessage: Message = { role: 'user', content: text };
      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      const newCount = dailyUsage + 1;
      setDailyUsage(newCount);
      const today = new Date().toISOString().split('T')[0];
      localStorage.setItem(
        'gemini-daily-usage',
        JSON.stringify({ count: newCount, date: today })
      );

      if (newCount >= DAILY_MESSAGE_LIMIT) {
        setLimitReached(true);
      }

      try {
        const geminiResponse = await sendMessageToGemini(history, text);
        const functionCalls = geminiResponse.functionCalls;

        let modelResponseText: string;
        let newHistory: ChatHistory = [
          ...history,
          { role: 'user', parts: [{ text }] },
        ];

        if (functionCalls && functionCalls.length > 0) {
          const call = functionCalls[0];
          let functionResult = '';

          if (call.name === 'saveUserData' && call.args) {
            functionResult = saveUserData(
              call.args.key as string,
              call.args.value as string
            );
          } else if (call.name === 'getUserData' && call.args) {
            functionResult = getUserData(call.args.key as string);
          }

          const functionResponsePart: Part[] = [
            {
              functionResponse: {
                name: call.name,
                response: { result: functionResult },
              },
            },
          ];

          const functionResponseResult = await sendMessageToGemini(
            [...newHistory, { role: 'model', parts: [{ functionCall: call }] }],
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

        const modelMessage: Message = {
          role: 'model',
          content: modelResponseText,
        };
        setMessages((prev) => [...prev, modelMessage]);

        newHistory.push({
          role: 'model',
          parts: [{ text: modelResponseText }],
        });
        setHistory(newHistory);
      } catch (error) {
        console.error('Error communicating with Gemini:', error);
        const errorMessage: Message = {
          role: 'model',
          content: 'عذراً، حدث خطأ ما. يرجى المحاولة مرة أخرى.',
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
        if (newCount >= DAILY_MESSAGE_LIMIT) {
          setTimeout(() => {
            const limitMessage: Message = {
              role: 'model',
              content:
                'لقد وصلت إلى حد الاستخدام اليومي. يرجى المحاولة مرة أخرى غداً.',
            };
            setMessages((prev) => [...prev, limitMessage]);
          }, 500);
        }
      }
    },
    [history, dailyUsage, limitReached, saveUserData, getUserData]
  );

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
            <h1 className="text-xl font-bold">
              مساعد الذاكرة بالذكاء الاصطناعي
            </h1>
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
              onClick={handleLogout}
              className="p-2 rounded-full hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
              aria-label="تسجيل الخروج"
            >
              <LogoutIcon className="w-6 h-6 text-red-400" />
            </button>
          </div>
        </header>
        <main
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6"
        >
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
