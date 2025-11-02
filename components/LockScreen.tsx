
import React, { useState } from 'react';
import BotIcon from './icons/BotIcon';

interface LockScreenProps {
  pinIsSet: boolean;
  onSetPin: (pin: string) => void;
  onLogin: (pin: string) => void;
  error: string | null;
}

const PIN_LENGTH = 4;

const LockScreen: React.FC<LockScreenProps> = ({ pinIsSet, onSetPin, onLogin, error }) => {
  const [pin, setPin] = useState<string>('');
  const [confirmPin, setConfirmPin] = useState<string>('');
  const [isConfirming, setIsConfirming] = useState<boolean>(false);

  const title = pinIsSet ? "أدخل رمز PIN للوصول" : (isConfirming ? "تأكيد رمز PIN" : "أنشئ رمز PIN للبدء");
  const currentPin = isConfirming ? confirmPin : pin;
  const setCurrentPin = isConfirming ? setConfirmPin : setPin;

  const handlePinInput = (digit: string) => {
    if (currentPin.length < PIN_LENGTH) {
      setCurrentPin(currentPin + digit);
    }
  };

  const handleDelete = () => {
    setCurrentPin(currentPin.slice(0, -1));
  };
  
  const handleNext = () => {
    if (pin.length === PIN_LENGTH) {
        setIsConfirming(true);
    }
  };

  const handleSubmit = () => {
    if (pinIsSet) {
        if (pin.length === PIN_LENGTH) {
            onLogin(pin);
            setPin(''); // Clear on attempt
        }
    } else {
        if (pin.length === PIN_LENGTH && confirmPin.length === PIN_LENGTH) {
            if(pin === confirmPin){
                onSetPin(pin);
            }
        }
    }
  };
  
  // Auto-submit on PIN completion
  React.useEffect(() => {
    if (pinIsSet && pin.length === PIN_LENGTH) {
      handleSubmit();
    }
    if(!pinIsSet && isConfirming && confirmPin.length === PIN_LENGTH){
        handleSubmit();
    }
  }, [pin, confirmPin, pinIsSet, isConfirming]);


  const PinDots = ({ filledCount }: { filledCount: number }) => (
    <div className="flex justify-center items-center gap-4 my-6" dir="ltr">
      {Array.from({ length: PIN_LENGTH }).map((_, index) => (
        <div
          key={index}
          className={`w-4 h-4 rounded-full transition-colors ${
            index < filledCount ? 'bg-cyan-400' : 'bg-gray-600'
          }`}
        />
      ))}
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white font-sans justify-center items-center p-4">
      <div className="w-full max-w-xs text-center">
        <BotIcon className="w-16 h-16 text-cyan-400 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">{title}</h1>
        <p className="text-gray-400 mb-4">
            {pinIsSet ? "هذا يحافظ على أمان ذاكرتك." : "مطلوب لحماية معلوماتك المحفوظة."}
        </p>

        <PinDots filledCount={currentPin.length} />

        {error && <p className="text-red-400 text-sm mb-4 h-5">{error}</p>}
        {!error && <div className="h-5 mb-4"></div>}
        
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
            <button
              key={digit}
              onClick={() => handlePinInput(digit.toString())}
              className="p-4 bg-gray-800 rounded-full text-2xl font-semibold hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              {digit}
            </button>
          ))}
          <div /> 
          <button
            onClick={() => handlePinInput('0')}
            className="p-4 bg-gray-800 rounded-full text-2xl font-semibold hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            0
          </button>
          <button
            onClick={handleDelete}
            className="p-4 bg-gray-800 rounded-full text-lg font-semibold hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 flex justify-center items-center"
            aria-label="حذف"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9.75L14.25 12m0 0l2.25 2.25M14.25 12L12 14.25m-2.25 2.25L12 12m0 0L9.75 9.75M12 12l2.25-2.25M12 12L9.75 14.25m0-4.5L12 12m0 0l2.25 2.25" />
            </svg>
          </button>
        </div>
        
        {!pinIsSet && !isConfirming && (
             <button
                onClick={handleNext}
                disabled={pin.length !== PIN_LENGTH}
                className="w-full mt-6 bg-cyan-600 text-white p-3 rounded-lg hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
            >
                التالي
            </button>
        )}
      </div>
    </div>
  );
};

export default LockScreen;
